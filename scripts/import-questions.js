// scripts/import-questions.js
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { prisma } from '../src/config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ----- Валидация входных данных -----
const optionSchema = z.object({
  text: z.string().min(1).max(150),
  isCorrect: z.boolean(),
});

const questionSchema = z.object({
  text: z.string().min(1).max(255),
  category: z.string().min(1).max(100).optional(),
  source: z.string().min(1).max(150).optional(),
  options: z.array(optionSchema).min(2).max(10),
});

const questionsSchema = z.array(questionSchema);

// нормализация строки для хеша
function normalize(s) {
  return s.normalize('NFKD').trim().toLowerCase().replace(/\s+/g, ' ');
}

// считаем стабильный slug по тексту+категории+вариантам
function makeSlug(q) {
  const cat = q.category ? normalize(q.category) : '';
  // Сортируем опции по тексту — чтобы порядок в файле не влиял на slug
  const opts = [...q.options]
    .map(o => ({ text: normalize(o.text), isCorrect: o.isCorrect }))
    .sort((a,b) => a.text.localeCompare(b.text));
  const payload = JSON.stringify({ text: normalize(q.text), cat, opts });
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 64);
}

// батчевалка
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const filePath = path.join(__dirname, '..', 'data', 'questions.json');
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const json = JSON.parse(raw);
  const data = questionsSchema.parse(json);

  console.log(`Loaded ${data.length} questions...`);

  // Импортируем батчами — например, по 200
  const BATCH = 200;

  for (const batch of chunk(data, BATCH)) {
    // Выполним запросы параллельно в рамках текущего батча
    await Promise.all(
      batch.map(async (q) => {
        const slug = makeSlug(q);

        // upsert по slug: если нет — создаём; если есть — заменяем опции
        await prisma.$transaction(async (tx) => {
          const existing = await tx.question.findUnique({
            where: { slug },
            include: { options: true },
          });

          if (!existing) {
            await tx.question.create({
              data: {
                slug,
                text: q.text,
                category: q.category ?? null,
                source: q.source ?? null,
                options: {
                  create: q.options.map(o => ({
                    text: o.text,
                    isCorrect: o.isCorrect,
                  })),
                },
              },
            });
          } else {
            await tx.answerOption.deleteMany({ where: { questionId: existing.id } });
            await tx.question.update({
              where: { id: existing.id },
              data: {
                text: q.text,
                category: q.category ?? existing.category ?? null,
                source: q.source ?? existing.source ?? null,
                options: {
                  create: q.options.map(o => ({
                    text: o.text,
                    isCorrect: o.isCorrect,
                  })),
                },
              },
            });
          }
        });
      })
    );

    console.log(`Imported batch of ${batch.length}`);
  }

  console.log('Done ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
