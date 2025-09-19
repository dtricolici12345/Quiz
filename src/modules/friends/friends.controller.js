import { prisma } from '../../config/prisma.js';
 import { sendPushToUsers } from '../notifications/onesignal.service.js'
// helper
const toInt = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};

async function create(req, res, next) {
  try {
    const fromUserId = toInt(req.user?.id);
    const toUserId   = toInt(req.body?.toUserId);

    if (!Number.isFinite(fromUserId)) return res.status(401).json({ error: 'Unauthorized' });
    if (!Number.isFinite(toUserId))   return res.status(400).json({ error: 'toUserId is required and must be a number' });
    if (fromUserId === toUserId)      return res.status(400).json({ error: 'Cannot send request to yourself' });

    const target = await prisma.user.findUnique({ where: { id: toUserId } });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const alreadyFriends = await prisma.friend.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { senderId: fromUserId, receiverId: toUserId },
          { senderId: toUserId,   receiverId: fromUserId },
        ],
      },
    });
    if (alreadyFriends) return res.status(409).json({ error: 'Already friends' });

    const pending = await prisma.friend.findFirst({
      where: {
        status: 'pending',
        OR: [
          { senderId: fromUserId, receiverId: toUserId },
          { senderId: toUserId,   receiverId: fromUserId },
        ],
      },
    });
    if (pending) return res.status(409).json({ error: 'Request already pending' });

    const fr = await prisma.friend.create({
      data: { senderId: fromUserId, receiverId: toUserId, status: 'pending' },
      select: { id: true, senderId: true, receiverId: true, status: true, requestedAt: true },
    });

    await prisma.notification.create({
  data: {
    userId: toUserId, // получатель заявки
    type: 'invite',
    text: `@${req.user.nickname || req.user.email} sent you a friend request`,
  },
});


await sendPushToUsers?.({
  externalUserIds: [toUserId],
  title: 'New friend request',
  body: `${req.user.nickname || req.user.email} invited you to be friends`,
  data: { type: 'friend_invite', fromUserId: fromUserId },
});


    return res.status(201).json(fr);
  } catch (err) { next(err); }
}

async function accept(req, res, next) {
  try {
    const requestId = toInt(req.params?.id);
    const me = toInt(req.user?.id);
    if (!Number.isFinite(requestId)) return res.status(400).json({ error: 'Invalid id' });

    const fr = await prisma.friend.findUnique({ where: { id: requestId } });
    if (!fr || fr.status !== 'pending') return res.status(404).json({ error: 'Request not found' });
    if (fr.receiverId !== me) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.friend.update({
      where: { id: requestId },
      data: { status: 'accepted' },
      select: { id: true, senderId: true, receiverId: true, status: true },
    });


    // updated уже есть, но нам нужен исходный fr (см. твой код: const fr = await prisma.friend.findUnique(...))
await prisma.notification.createMany({
  data: [
    {
      userId: fr.senderId,
      type: 'invite',
      text: `@${req.user.nickname || req.user.email} accepted your friend request`,
    },
    {
      userId: fr.receiverId,
      type: 'invite',
      text: `You and @${
        (await prisma.user.findUnique({ where: { id: fr.senderId }, select: { nickname: true, email: true } }))
          ?.nickname || 'user'
      } are now friends`,
    },
  ],
});

// опционально: пуши
await sendPushToUsers?.({
  externalUserIds: [fr.senderId],
  title: 'Friend request accepted',
  body: `${req.user.nickname || req.user.email} accepted your friend request`,
  data: { type: 'friend_accept', userId: fr.receiverId },
});

    return res.status(200).json(updated);
  } catch (err) { next(err); }
}

async function decline(req, res, next) {
  try {
    const requestId = toInt(req.params?.id);
    const me = toInt(req.user?.id);
    if (!Number.isFinite(requestId)) return res.status(400).json({ error: 'Invalid id' });

    const fr = await prisma.friend.findUnique({ where: { id: requestId } });
    if (!fr || fr.status !== 'pending') return res.status(404).json({ error: 'Request not found' });
    if (fr.receiverId !== me) return res.status(403).json({ error: 'Forbidden' });

    const updated = await prisma.friend.update({
      where: { id: requestId },
      data: { status: 'declined' },
      select: { id: true, senderId: true, receiverId: true, status: true },
    });

    return res.status(200).json(updated);
  } catch (err) { next(err); }
}

async function list(req, res, next) {
  try {
    const me = Number(req.user?.id);
    if (!Number.isFinite(me)) return res.status(401).json({ error: 'Unauthorized' });

    const edges = await prisma.friend.findMany({
      where: {
        status: 'accepted',
        OR: [{ senderId: me }, { receiverId: me }],
      },
      select: { senderId: true, receiverId: true },
      orderBy: { requestedAt: 'desc' },
    });

    if (edges.length === 0) return res.status(200).json([]);

    const otherIds = edges.map(e => (e.senderId === me ? e.receiverId : e.senderId));

    const users = await prisma.user.findMany({
      where: { id: { in: otherIds } },
      select: { id: true, nickname: true, avatarUrl: true, rating: true },
    });

    const map = new Map(users.map(u => [u.id, u]));
    const friends = otherIds.map(id => map.get(id)).filter(Boolean);

    return res.status(200).json(friends);
  } catch (err) {
    console.error('[friends.list] error:', err);
    next(err);
  }
}

// NEW: список заявок (pending) — incoming | outgoing
async function listRequests(req, res, next) {
  try {
    const me = Number(req.user?.id);
    const type = req.query.type; // 'incoming' | 'outgoing'
    if (!Number.isFinite(me)) return res.status(401).json({ error: 'Unauthorized' });

    const where = (type === 'incoming')
      ? { status: 'pending', receiverId: me }
      : { status: 'pending', senderId: me };

    const rows = await prisma.friend.findMany({
      where,
      include: {
        sender:  { select: { id: true, nickname: true, avatarUrl: true, rating: true } },
        receiver:{ select: { id: true, nickname: true, avatarUrl: true, rating: true } },
      },
      orderBy: { requestedAt: 'desc' },
    });

    const normalized = rows.map(f => ({
      id: f.id,
      status: f.status,            // 'pending'
      requestedAt: f.requestedAt,
      direction: f.senderId === me ? 'sent' : 'received',
      user: f.senderId === me ? f.receiver : f.sender, // другая сторона
    }));

    return res.status(200).json(normalized);
  } catch (err) { next(err); }
}

// NEW: отмена своей pending-заявки (только отправитель)
async function cancelPending(req, res, next) {
  try {
    const me = Number(req.user?.id);
    const id = Number(req.params?.id);
    if (!Number.isFinite(me)) return res.status(401).json({ error: 'Unauthorized' });
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const fr = await prisma.friend.findUnique({ where: { id } });
    if (!fr || fr.status !== 'pending') return res.status(404).json({ error: 'Request not found' });
    if (fr.senderId !== me) return res.status(403).json({ error: 'Only sender can cancel' });

    await prisma.friend.delete({ where: { id } });
    return res.sendStatus(204);
  } catch (err) { next(err); }
}

// NEW: удалить из друзей (accepted) в обе стороны
async function remove(req, res, next) {
  try {
    const me = Number(req.user?.id);
    const otherId = Number(req.params?.userId);
    if (!Number.isFinite(me)) return res.status(401).json({ error: 'Unauthorized' });
    if (!Number.isFinite(otherId)) return res.status(400).json({ error: 'Invalid userId' });

    const rel = await prisma.friend.findFirst({
      where: {
        status: 'accepted',
        OR: [
          { senderId: me, receiverId: otherId },
          { senderId: otherId, receiverId: me },
        ],
      },
      select: { id: true },
    });

    if (!rel) return res.sendStatus(404);

    await prisma.friend.delete({ where: { id: rel.id } });
    return res.sendStatus(204);
  } catch (err) { next(err); }
}

export const FriendsController = {
  create,
  accept,
  decline,
  list,
  listRequests,   // new
  cancelPending,  // new
  remove,         // new
};
