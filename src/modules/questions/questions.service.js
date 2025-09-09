import { prisma } from '../../config/prisma.js';

export async function listQuestions({ page = 1, limit = 20, category, q }) {
  const where = {};
  if (category) where.category = category;
  if (q) where.text = { contains: q, mode: 'insensitive' };

  const [total, items] = await Promise.all([
    prisma.question.count({ where }),
    prisma.question.findMany({
      where,
      orderBy: { id: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { options: true } // ВНИМАНИЕ: isCorrect утекает — только для проверки
    })
  ]);

  return { page, limit, total, pages: Math.ceil(total / limit), items };
}
