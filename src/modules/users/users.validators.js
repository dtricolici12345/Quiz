
import { z } from 'zod';

// GET /api/users?page=1&limit=20&q=abc&sort=rating|createdAt&order=asc|desc
export const listUsersSchema = z.object({
  query: z.object({
    page:  z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    q:     z.string().trim().min(1).max(100).optional(),
    sort:  z.enum(['rating', 'createdAt']).optional().default('rating'),
    order: z.enum(['asc', 'desc']).optional().default('desc'),
  })
});

export const userIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  })
});

// PATCH /api/users/me
export const updateMeSchema = z.object({
  body: z.object({
    nickname:  z
      .string()
      .trim()
      .min(1, 'Nickname is required')
      .max(50, 'Nickname must be at most 50 characters')
      .optional(),

    // allow either a valid URL string or null (to remove avatar)
    avatarUrl: z
      .string()
      .trim()
      .url('Avatar URL must be a valid URL')
      .max(255, 'Avatar URL must be at most 255 characters')
      .nullable()
      .optional(),
  })
  .refine(
    (b) =>
      Object.prototype.hasOwnProperty.call(b, 'nickname') ||
      Object.prototype.hasOwnProperty.call(b, 'avatarUrl'),
    { message: 'Provide at least one field: nickname or avatarUrl' }
  ),
});

// PATCH /api/users/me/password
export const changePasswordSchema = z.object({
  body: z.object({
    oldPassword: z.string().min(8).max(64),
    newPassword: z
      .string()
      .min(8).max(64)
      .regex(/[A-Za-z]/, 'At least one letter')
      .regex(/[0-9]/, 'At least one digit')
      .refine((s) => !/\s/.test(s) && s.trim() === s, 'No spaces'),
  }),
});