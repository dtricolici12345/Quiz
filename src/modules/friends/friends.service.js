// src/modules/friends/friends.service.js
import { prisma } from '../../config/prisma.js';

// Что мы показываем про пользователя в списках
const publicUserSelect = {
  id: true,
  nickname: true,
  avatarUrl: true,
  rating: true,
  createdAt: true,
};

export const FriendsService = {
  /**
   * Отправить запрос в друзья.
   * Правила:
   * - нельзя добавлять себя;
   * - если встречная заявка на меня уже PENDING — сразу делаем ACCEPTED (auto-accept);
   * - если уже друзья — 409;
   * - если моя заявка уже PENDING — 409;
   * - если когда-то DECLINED — 409 (в MVP не переотправляем).
   */
  async sendRequest(meId, targetUserId) {
    if (meId === targetUserId) {
      const err = new Error('Нельзя добавить самого себя');
      err.status = 400;
      throw err;
    }

    // проверяем, что цель существует
    const target = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!target) {
      const err = new Error('Пользователь не найден');
      err.status = 404;
      throw err;
    }

    // ищем любую связь между пользователями (в обе стороны)
    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { senderId: meId, receiverId: targetUserId },
          { senderId: targetUserId, receiverId: meId },
        ],
      },
    });

    if (!existing) {
      // связи нет — создаём новую PENDING-заявку (я -> он)
      const created = await prisma.friend.create({
        data: {
          senderId: meId,
          receiverId: targetUserId,
          status: 'pending',
        },
      });
      return { action: 'requested', friend: created };
    }

    // есть запись — разбираем статусы
    if (existing.status === 'accepted') {
      const err = new Error('Вы уже друзья');
      err.status = 409;
      throw err;
    }

    if (existing.status === 'pending') {
      // Если заявка шла ОТ НЕГО КО МНЕ — принимаем автоматически
      if (existing.senderId === targetUserId && existing.receiverId === meId) {
        const accepted = await prisma.friend.update({
          where: { id: existing.id },
          data: { status: 'accepted' },
        });
        return { action: 'auto_accepted', friend: accepted };
      }
      // Иначе — моя заявка уже отправлена
      const err = new Error('Заявка уже отправлена');
      err.status = 409;
      throw err;
    }

    if (existing.status === 'declined') {
      const err = new Error('Запрос ранее был отклонён');
      err.status = 409;
      throw err;
    }

    // На всякий случай
    const err = new Error('Невозможно обработать запрос');
    err.status = 409;
    throw err;
  },

  /**
   * Принять входящую заявку (только получатель может принять).
   */
  async acceptRequest(meId, friendId) {
    const req = await prisma.friend.findUnique({ where: { id: friendId } });
    if (!req) {
      const e = new Error('Запрос не найден');
      e.status = 404;
      throw e;
    }
    if (req.status !== 'pending') {
      const e = new Error('Запрос уже обработан');
      e.status = 409;
      throw e;
    }
    if (req.receiverId !== meId) {
      const e = new Error('Вы не получатель этого запроса');
      e.status = 403;
      throw e;
    }

    return prisma.friend.update({
      where: { id: friendId },
      data: { status: 'accepted' },
    });
  },

  /**
   * Отклонить входящую заявку (только получатель может отклонить).
   */
  async declineRequest(meId, friendId) {
    const req = await prisma.friend.findUnique({ where: { id: friendId } });
    if (!req) {
      const e = new Error('Запрос не найден');
      e.status = 404;
      throw e;
    }
    if (req.status !== 'pending') {
      const e = new Error('Запрос уже обработан');
      e.status = 409;
      throw e;
    }
    if (req.receiverId !== meId) {
      const e = new Error('Вы не получатель этого запроса');
      e.status = 403;
      throw e;
    }

    return prisma.friend.update({
      where: { id: friendId },
      data: { status: 'declined' },
    });
  },

  /**
   * Список друзей/заявок текущего пользователя по статусу.
   * Возвращает нормализованные объекты с "direction" и карточкой "user".
   */
  async list(userId, { status = 'accepted' }) {
    const rows = await prisma.friend.findMany({
      where: {
        status,
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: { select: publicUserSelect },
        receiver: { select: publicUserSelect },
      },
      orderBy: { requestedAt: 'desc' },
    });

    return rows.map((f) => {
      const direction = f.senderId === userId ? 'sent' : 'received';
      const friendUser = f.senderId === userId ? f.receiver : f.sender;
      return {
        id: f.id,
        status: f.status,           // pending | accepted | declined
        requestedAt: f.requestedAt,
        direction,                  // 'sent' или 'received'
        user: friendUser,           // карточка противоположного пользователя
      };
    });
  },
};
