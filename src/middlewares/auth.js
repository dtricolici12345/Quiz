// src/middlewares/auth.js
import { prisma } from '../config/prisma.js';
import { verifyAccess } from '../modules/auth/jwt.js';

/**
 * Достаёт Bearer-токен из заголовка Authorization.
 * Возвращает строку токена либо null.
 */
function getBearerToken(req) {
  const header = req.headers?.authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : null;
}

/**
 * Auth middleware: проверяет access JWT, находит актуального пользователя,
 * прикрепляет его к req.user и пропускает дальше. Иначе — 401.
 *
 * Требования:
 *  - Заголовок: Authorization: Bearer <accessToken>
 *  - verifyAccess(token) должен выбросить ошибку при невалидном/просроченном токене
 *  - Пользователь не должен быть soft-deleted (deletedAt = null)
 */
export async function auth(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: 'No token' });
    }

    // verifyAccess должен вернуть payload вида { sub, email, iat, exp, ... }
    const payload = verifyAccess(token);
    const userId = Number(payload?.sub);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Invalid token payload' });
    }

    // Находим актуального пользователя (не удалённого)
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        rating: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Прокладываем в req
    req.user = user;
    req.userId = user.id;

    return next();
  } catch (err) {
    // Возможные причины: подпись невалидна, токен просрочен, формат неверный
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
