// src/modules/notifications/notifications.service.js
import { prisma } from '../../config/prisma.js';

export const NotificationsService = {
  list(userId, { status = 'sent' } = {}) {
    return prisma.notification.findMany({
      where: { userId, status },
      orderBy: { createdAt: 'desc' },
      select: { id:true, type:true, text:true, status:true, createdAt:true, roundId:true, gameId:true },
    });
  },

  async markRead(userId, id) {
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== userId) return null;
    await prisma.notification.update({ where: { id }, data: { status: 'read' } });
    return true;
  },

  async markAllRead(userId) {
    await prisma.notification.updateMany({
      where: { userId, status: 'sent' },
      data: { status: 'read' },
    });
    return true;
  },
};
