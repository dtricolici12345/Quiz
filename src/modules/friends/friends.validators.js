import { z } from 'zod';

export const createFriendSchema = z.object({
  body: z.object({
    userId: z.number().int().positive(),
  }),
});

export const friendIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

export const listFriendsSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'accepted', 'declined']).default('accepted'),
  }),
});