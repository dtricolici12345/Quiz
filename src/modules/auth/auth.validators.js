import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(254),
    password: z
      .string()
      .min(8, 'Минимум 8 символов')
      .max(64, 'Максимум 64 символа')
      .regex(/[A-Za-z]/, 'Должна быть хотя бы одна буква')
      .regex(/[0-9]/, 'Должна быть хотя бы одна цифра')
      .refine((s) => !/\s/.test(s) && s.trim() === s, 'Пароль не должен содержать пробелы'),
    nickname: z.string().trim().min(1, 'Ник обязателен').max(50, 'Максимум 50 символов'),
    avatarUrl: z.string().url().max(255).optional(),
  }).refine(({ email, password }) => {
    return !password.toLowerCase().includes(email.toLowerCase());
  }, { message: 'Пароль не должен содержать e-mail' }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(254),
    password: z.string().min(1, 'Пароль обязателен'),
  }),
});