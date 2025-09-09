import { prisma } from '../config/prisma.js';
import { hashPassword, verifyPassword } from '../modules/auth/password.js';

const ALLOWED_SORT = new Set(['rating', 'createdAt', 'nickname', 'email', 'id']);

/**
 * Публичный список пользователей (без удалённых), с поиском/сортировкой/пагинацией.
 */
export async function listUsers({
  page = 1,
  limit = 20,
  q,
  sort = 'rating',
  order = 'desc',
} = {}) {
  page = Math.max(1, Number(page) || 1);
  limit = Math.min(100, Math.max(1, Number(limit) || 20));

  order = String(order).toLowerCase() === 'asc' ? 'asc' : 'desc';
  sort = ALLOWED_SORT.has(String(sort)) ? String(sort) : 'rating';

  const whereBase = { deletedAt: null };

  const where = q
    ? {
        AND: [
          whereBase,
          {
            OR: [
              { nickname: { contains: q, mode: 'insensitive' } },
              { email:    { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      }
    : whereBase;

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ [sort]: order }, { id: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true, email: true, nickname: true, avatarUrl: true, rating: true, createdAt: true,
      },
    }),
  ]);

  return { page, limit, total, pages: Math.ceil(total / limit), items };
}

/**
 * Публичная карточка пользователя по id (без удалённых).
 */
export async function getUserById(id) {
  if (!Number(id)) return null;

  return prisma.user.findFirst({
    where: { id: Number(id), deletedAt: null },
    select: {
      id: true, email: true, nickname: true, avatarUrl: true, rating: true, createdAt: true,
    },
  });
}

/**
 * Обновление собственного профиля (nickname, avatarUrl).
 * Проверяем уникальность nickname среди НЕ удалённых.
 */
export async function updateMe(userId, { nickname, avatarUrl }) {
  const data = {};

  if (typeof nickname === 'string') {
    const nn = nickname.trim();
    if (!nn) throw new Error('Nickname must not be empty');
    // проверка уникальности ника среди активных
    const exists = await prisma.user.findFirst({
      where: {
        id: { not: userId },
        nickname: nn,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (exists) throw new Error('Nickname already exists');
    data.nickname = nn;
  }

  if (typeof avatarUrl === 'string') {
    data.avatarUrl = avatarUrl || null;
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, email: true, nickname: true, avatarUrl: true, rating: true, createdAt: true,
    },
  });

  return updated;
}

/**
 * Смена пароля: проверяем старый, хешируем новый.
 * body: { oldPassword, newPassword }
 */
export async function changePassword(userId, { oldPassword, newPassword }) {
  const user = await prisma.user.findFirst({
    where: { id: userId, deletedAt: null },
    select: { id: true, passwordHash: true },
  });
  if (!user) throw new Error('User not found');

  const ok = await verifyPassword(oldPassword, user.passwordHash);
  if (!ok) throw new Error('Wrong old password');

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return { changed: true };
}

/**
 * Soft-delete: анонимизируем и помечаем deletedAt.
 * - nickname/email занять, чтобы их нельзя было переиспользовать (опционально).
 * - avatarUrl -> null.
 * - выставляем deletedAt = now.
 */
export async function anonymizeUser(userId) {
  // Можно «забронировать» старый email, чтобы его нельзя было использовать повторно:
  // например, префиксом "deleted:<timestamp>:".
  const now = new Date();
  const suffix = `:deleted:${now.getTime()}`;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, nickname: true },
  });

  // Если пользователя уже нет — считаем ок (идемпотентность)
  if (!user) return { ok: true };

  await prisma.user.update({
    where: { id: userId },
    data: {
      email:    `${user.email}${suffix}`,
      nickname: user.nickname ? `${user.nickname}${suffix}` : null,
      avatarUrl: null,
      deletedAt: now,
    },
  });

  return { ok: true };
}
