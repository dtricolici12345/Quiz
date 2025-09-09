
export function errorHandler(err, _req, res, _next) {
  console.error(err);

  // Ошибка уникальности Prisma (email/nickname)
  if (err?.code === 'P2002') {
    return res.status(409).json({ error: 'Unique constraint failed', meta: err.meta });
  }

  res.status(500).json({ error: err?.message ?? 'Internal error' });
}
