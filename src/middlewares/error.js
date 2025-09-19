
// src/middlewares/error.js
export function errorHandler(err, req, res, next) {
  // Prisma unique
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'Unique constraint failed', meta: err.meta });
  }
  // Zod
  if (err?.name === 'ZodError') {
    return res.status(400).json({ error: err.errors });
  }
  // Авторизация
  if (err?.name === 'AuthError') {
    return res.status(401).json({ error: err.message || 'Unauthorized' });
  }

  console.error(err); // оставь для локальной отладки
  return res.status(500).json({ error: 'Internal Server Error' });
}
