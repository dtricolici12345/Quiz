import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Помощник: засеять один вопрос с вариантами.
 * Если вопрос с таким text уже есть — пропускаем (идемпотентность).
 */
async function seedQuestion({ text, category, source = 'seed', options }) {
  const exists = await prisma.question.findFirst({ where: { text } });
  if (exists) {
    console.log('Skip (already exists):', text);
    return exists;
  }

  return prisma.question.create({
    data: {
      text,
      category,
      source,
      options: {
        create: options.map(o => ({
          text: o.text,
          isCorrect: o.isCorrect,
        })),
      },
    },
  });
}

async function main() {
  // Если уже есть вопросы — ничего не делаем (защита от дублей).
  const count = await prisma.question.count();
  if (count > 0) {
    console.log(`Questions already present (${count}). Seed skipped.`);
    return;
  }

  // Набор стартовых вопросов (пример)
  const QUESTIONS = [
    {
      text: 'Who won the FIFA World Cup in 2018?',
      category: 'worldcup',
      options: [
        { text: 'France',  isCorrect: true  },
        { text: 'Croatia', isCorrect: false },
        { text: 'Germany', isCorrect: false },
        { text: 'Brazil',  isCorrect: false },
      ],
    },
    {
      text: 'Which club does Lionel Messi play for in 2024?',
      category: 'players',
      options: [
        { text: 'Inter Miami', isCorrect: true  },
        { text: 'PSG',         isCorrect: false },
        { text: 'Barcelona',   isCorrect: false },
        { text: 'Manchester City', isCorrect: false },
      ],
    },
    {
      text: 'How many players per team are on the pitch in football?',
      category: 'rules',
      options: [
        { text: '11', isCorrect: true  },
        { text: '10', isCorrect: false },
        { text: '12', isCorrect: false },
        { text: '9',  isCorrect: false },
      ],
    },
    {
      text: 'Which country has won the most UEFA EURO titles?',
      category: 'euro',
      options: [
        { text: 'Germany', isCorrect: true  }, // (GER/West GER)
        { text: 'Spain',   isCorrect: true  }, // если хочешь строго — сделай один correct
        { text: 'Italy',   isCorrect: false },
        { text: 'France',  isCorrect: false },
      ],
    },
    {
      text: 'Which position usually wears number 1?',
      category: 'rules',
      options: [
        { text: 'Goalkeeper', isCorrect: true  },
        { text: 'Striker',    isCorrect: false },
        { text: 'Left back',  isCorrect: false },
        { text: 'Winger',     isCorrect: false },
      ],
    },
  ];

  for (const q of QUESTIONS) {
    const created = await seedQuestion(q);
    if (created) console.log('Seeded question:', created.id, '-', created.text);
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
