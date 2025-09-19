// src/modules/games/games.validators.js
import { z } from 'zod';

// POST /api/games
export const createGameSchema = z.object({
  body: z.object({
    opponentId: z.coerce.number().int().positive(),
    rounds: z.coerce.number().int().min(1).max(10).optional(),
    questionsPerRound: z.coerce.number().int().min(1).max(20).optional(),
  }),
});

// :id в пути
export const gameIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

// GET /api/games?status=...
export const listGamesSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'in_progress', 'finished', 'expired', 'canceled']).optional(),
  }).partial(),
});

// POST /api/games/:id/answers
export const submitAnswersSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    answers: z.array(z.object({
      questionId: z.coerce.number().int().positive(),
      // optionId может быть отсутствовать (не ответил). Тогда пишем null.
      optionId: z.coerce.number().int().positive().optional(),
      elapsedMs: z.coerce.number().int().min(0).optional(),
    })).min(1),
  }),
});
