import { z } from 'zod';

export const listNotificationsSchema = z.object({
  query: z.object({
    status: z.enum(['sent','read']).optional(),
  }).partial(),
});

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});
