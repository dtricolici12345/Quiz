// src/modules/auth/auth.service.js
import { prisma } from '../../config/prisma.js';
import { hashPassword, verifyPassword } from './password.js';
import { signAccess, signRefresh, verifyRefresh } from './jwt.js';
import { sha256 } from './token-hash.js';

const {
  REFRESH_COOKIE_NAME = 'refreshToken',
  REFRESH_COOKIE_PATH = '/api/auth',
  JWT_REFRESH_TTL = '30d',
} = process.env;

/** Примитивный парсер TTL вида 15m / 12h / 30d → миллисекунды */
function ttlToMs(ttl) {
  const m = String(ttl).match(/^(\d+)([smhd])$/i);
  if (!m) return 30 * 24 * 60 * 60 * 1000; // дефолт 30d
  const n = Number(m[1]);
  const u = m[2].toLowerCase();
  const map = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return n * map[u];
}
const refreshMaxAgeMs = ttlToMs(JWT_REFRESH_TTL);

/** Поставить refresh-куку */
function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,                // В проде на HTTPS поставить true
    path: REFRESH_COOKIE_PATH,    // Кука будет отправляться на /api/auth, /api/auth/refresh, /api/auth/logout
    maxAge: refreshMaxAgeMs,
  });
}

/** Выдать пары токенов + создать refresh-сессию + установить cookie */
async function issueTokensAndSetCookie({ user, req, res }) {
  // access
  const access = signAccess({ sub: user.id, email: user.email });

  // refresh (+ jti)
  const { token: refreshToken, jti } = signRefresh({ sub: user.id, email: user.email });

  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      jti,
      tokenHash: sha256(refreshToken),
      userAgent: req.headers['user-agent']?.slice(0, 255) ?? null,
      ip: (req.ip ?? '').slice(0, 45) || null,
      expiresAt: new Date(Date.now() + refreshMaxAgeMs),
    },
  });

  setRefreshCookie(res, refreshToken);
  return { token: access };
}

/** Регистрация */
export async function register({ email, password, nickname, avatarUrl, req, res }) {
  const emailNorm = email.toLowerCase().trim();
  const nicknameNorm = nickname?.trim();

  // Проверяем уникальность среди активных пользователей (soft-delete у нас есть)
  const emailExists = await prisma.user.findFirst({
    where: { email: emailNorm, deletedAt: null },
    select: { id: true },
  });
  if (emailExists) throw new Error('User with this email already exists');

  if (nicknameNorm) {
    const nickExists = await prisma.user.findFirst({
      where: { nickname: nicknameNorm, deletedAt: null },
      select: { id: true },
    });
    if (nickExists) throw new Error('Nickname already exists');
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      email: emailNorm,
      passwordHash,
      nickname: nicknameNorm,     // ник у тебя обязательный в схеме — сюда придёт из валидатора
      avatarUrl: avatarUrl ?? null,
    },
    select: { id: true, email: true, nickname: true, avatarUrl: true, rating: true, createdAt: true },
  });

  const { token } = await issueTokensAndSetCookie({ user, req, res });
  return { user, token };
}

/** Логин */
export async function login({ email, password, req, res }) {
  const emailNorm = email.toLowerCase().trim();

  // Только активные пользователи (deletedAt = null)
  const user = await prisma.user.findFirst({
    where: { email: emailNorm, deletedAt: null },
  });
  if (!user) throw new Error('Invalid email or password');

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new Error('Invalid email or password');

  const userOut = {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    rating: user.rating,
    createdAt: user.createdAt,
  };

  const { token } = await issueTokensAndSetCookie({ user: userOut, req, res });
  return { user: userOut, token };
}

/** Refresh (по cookie/по body) + ротация refresh */
export async function refresh({ req, res }) {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;
  if (!raw) throw new Error('No refresh token');

  const payload = verifyRefresh(raw); // { sub, email, jti, iat, exp }

  const session = await prisma.refreshSession.findUnique({ where: { jti: payload.jti } });
  if (!session || session.userId !== Number(payload.sub)) throw new Error('Invalid refresh session');
  if (session.revokedAt) throw new Error('Refresh revoked');
  if (session.expiresAt <= new Date()) throw new Error('Refresh expired');
  if (session.tokenHash !== sha256(raw)) throw new Error('Refresh mismatch');

  // Пользователь должен существовать и быть активным
  const user = await prisma.user.findFirst({
    where: { id: Number(payload.sub), deletedAt: null },
    select: { id: true, email: true },
  });
  if (!user) throw new Error('User not found');

  // Ротация: пометили старую сессию отозванной
  await prisma.refreshSession.update({
    where: { jti: session.jti },
    data: { revokedAt: new Date() },
  });

  // Выдаём новый refresh + access
  const access = signAccess({ sub: user.id, email: user.email });
  const { token: newRefresh, jti: newJti } = signRefresh({ sub: user.id, email: user.email });

  await prisma.refreshSession.create({
    data: {
      userId: user.id,
      jti: newJti,
      tokenHash: sha256(newRefresh),
      userAgent: req.headers['user-agent']?.slice(0, 255) ?? null,
      ip: (req.ip ?? '').slice(0, 45) || null,
      expiresAt: new Date(Date.now() + refreshMaxAgeMs),
    },
  });

  setRefreshCookie(res, newRefresh);
  return { token: access };
}

/** Logout: отзываем текущий refresh и чистим куку */
export async function logout({ req, res }) {
  const raw = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

  if (raw) {
    try {
      const payload = verifyRefresh(raw);
      await prisma.refreshSession.updateMany({
        where: { jti: payload.jti, userId: Number(payload.sub), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } catch {
      // токен мог истечь/быть битым — просто чистим куку
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
  return { ok: true };
}