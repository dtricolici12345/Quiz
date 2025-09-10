// src/modules/friends/friends.controller.js
import { FriendsService } from './friends.service.js';

export const FriendsController = {
  // POST /api/friends — отправить заявку
  create: async (req, res, next) => {
    try {
      const me = req.user.id;              // из auth-мидлвара
      const { userId } = req.body;

      const result = await FriendsService.sendRequest(me, userId);

      if (result.action === 'requested') {
        return res.status(201).json({
          data: {
            id: result.friend.id,
            status: result.friend.status,      // pending
            senderId: result.friend.senderId,
            receiverId: result.friend.receiverId,
            requestedAt: result.friend.requestedAt,
          },
        });
      }

      if (result.action === 'auto_accepted') {
        return res.status(200).json({
          data: {
            id: result.friend.id,
            status: result.friend.status,      // accepted
            senderId: result.friend.senderId,
            receiverId: result.friend.receiverId,
            requestedAt: result.friend.requestedAt,
          },
        });
      }

      return res.status(200).json({ data: result });
    } catch (e) { next(e); }
  },

  // POST /api/friends/:id/accept — принять входящую заявку
  accept: async (req, res, next) => {
    try {
      const me = req.user.id;
      const friendId = Number(req.params.id);

      const updated = await FriendsService.acceptRequest(me, friendId);

      return res.json({
        data: {
          id: updated.id,
          status: updated.status,            // accepted
          senderId: updated.senderId,
          receiverId: updated.receiverId,
          requestedAt: updated.requestedAt,
        },
      });
    } catch (e) { next(e); }
  },

  // POST /api/friends/:id/decline — отклонить входящую заявку
  decline: async (req, res, next) => {
    try {
      const me = req.user.id;
      const friendId = Number(req.params.id);

      const updated = await FriendsService.declineRequest(me, friendId);

      return res.json({
        data: {
          id: updated.id,
          status: updated.status,            // declined
          senderId: updated.senderId,
          receiverId: updated.receiverId,
          requestedAt: updated.requestedAt,
        },
      });
    } catch (e) { next(e); }
  },
  
  list: async (req, res, next) => {
    try {
      const me = req.user.id;
      const status = (req.query?.status ?? 'accepted');
      const data = await FriendsService.list(me, { status });
      return res.json({ data });
    } catch (e) { next(e); }
  },
};

