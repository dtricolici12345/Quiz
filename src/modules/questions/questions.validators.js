import { z } from 'zod';

export const listQuestionsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    category: z.string().min(1).max(100).optional(),
    q: z.string().min(1).optional()
  })
});
