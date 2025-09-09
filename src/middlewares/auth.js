// src/middlewares/auth.js
import { verifyAccess } from '../modules/auth/jwt.js';
import { prisma } from '../config/prisma.js';

export async function auth(req, res, next) {
  try {
    // Authorization: Bearer <token>
    const h = req.headers.authorization || '';
    const m = /^Bearer\s+(.+)$/i.exec(h);
    if (!m) return res.status(401).json({ error: 'No token' });

    const token = m[1];

    // проверяем подпись и срок действия access-токена
    const payload = verifyAccess(token); // { sub, email, iat, exp } — бросит ошибку если невалиден
    const userId = Number(payload.sub);
    if (!userId) return res.status(401).json({ error: 'Invalid token payload' });

    // тянем актуального и НЕ удалённого пользователя
    const user = await prisma.user.findFirst({
      where: { id: userId, deletedAt: null }, // <-- важный фильтр для soft-delete
      select: {
        id: true,
        email: true,
        nickname: true,
        avatarUrl: true,
        rating: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(401).json({ error: 'User not found' });

    req.user = user;
    req.userId = user.id;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
