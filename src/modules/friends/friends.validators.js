import { z } from 'zod';

// POST /api/friends  (A -> B)
export const createFriendSchema = z.object({
  body: z.object({
    toUserId: z.coerce.number().int().positive(),
  }),
});

// POST|PATCH /api/friends/:id/accept|decline
export const friendIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

// GET /api/friends
export const listFriendsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }).partial(),
});

// GET /api/friends/requests?type=incoming|outgoing
export const listRequestsSchema = z.object({
  query: z.object({
    type: z.enum(['incoming', 'outgoing']),
  }),
});

// DELETE /api/friends/requests/:id  (отмена своей pending-заявки)
export const requestIdParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
});

// DELETE /api/friends/:userId  (удалить из друзей)
export const friendUserIdParamSchema = z.object({
  params: z.object({
    userId: z.coerce.number().int().positive(),
  }),
});
