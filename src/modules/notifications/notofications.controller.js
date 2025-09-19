import { NotificationsService } from './notifications.service.js';

export async function list(req, res, next) {
  try {
    const userId = req.user.id;
    const status = (req.query.status === 'read') ? 'read' : 'sent';
    const rows = await NotificationsService.list(userId, { status });
    res.json(rows);
  } catch (e) { next(e); }
}

export async function markRead(req, res, next) {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });

    const ok = await NotificationsService.markRead(userId, id);
    if (!ok) return res.status(404).json({ error: 'Not found' });
    res.sendStatus(204);
  } catch (e) { next(e); }
}

export async function markAllRead(req, res, next) {
  try {
    await NotificationsService.markAllRead(req.user.id);
    res.sendStatus(204);
  } catch (e) { next(e); }
}
