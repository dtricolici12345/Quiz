// src/modules/games/games.controller.js
import { GamesService } from './games.service.js';
import { prisma } from '../../config/prisma.js';
import { sendPushToUsers } from '../notifications/onesignal.service.js';

export async function create(req, res, next) {
  try {
    const me = req.user.id;
    const { opponentId, rounds, questionsPerRound } = req.body;
    const game = await GamesService.create({ meId: me, opponentId: Number(opponentId) });

    // локальная нотификация + пуш (опционально)
    await prisma.notification.create({
      data: { userId: Number(opponentId), type: 'invite', text: `@${req.user.nickname || req.user.email} invited you to a game` }
    });
    await sendPushToUsers?.({
      externalUserIds: [Number(opponentId)],
      title: 'New game invite',
      body: `${req.user.nickname || req.user.email} invited you to play`,
      data: { type: 'game_invite', gameId: game.id }
    });

    res.status(201).json(game);
  } catch (e) { next(e); }
}

export async function accept(req, res, next) {
  try {
    const me = req.user.id;
    const id = Number(req.params.id);
    const result = await GamesService.accept({ meId: me, gameId: id });
    await prisma.notification.create({
      data: { userId: (await prisma.game.findUnique({ where: { id }, select: { player1Id:true } })).player1Id, type: 'round_start', text: 'Game accepted. Round 1 started' }
    });
    res.json(result);
  } catch (e) { next(e); }
}

export async function decline(req, res, next) {
  try {
    const me = req.user.id;
    const id = Number(req.params.id);
    await GamesService.decline({ meId: me, gameId: id });
    const g = await prisma.game.findUnique({ where: { id }, select: { player1Id:true } });
    if (g) {
      await prisma.notification.create({ data: { userId: g.player1Id, type: 'result', text: 'Your invite was declined' } });
    }
    res.sendStatus(204);
  } catch (e) { next(e); }
}

export async function list(req, res, next) {
  try {
    const me = req.user.id;
    const items = await GamesService.list({ meId: me, status: req.query.status });
    res.json(items);
  } catch (e) { next(e); }
}

export async function getById(req, res, next) {
  try {
    const me = req.user.id;
    const id = Number(req.params.id);
    const game = await GamesService.getById({ meId: me, gameId: id });
    res.json(game);
  } catch (e) { next(e); }
}

export async function submitAnswers(req, res, next) {
  try {
    const me = req.user.id;
    const id = Number(req.params.id);
    const { answers } = req.body;
    await GamesService.submitAnswers({ meId: me, gameId: id, answers });
    res.sendStatus(204);
  } catch (e) { next(e); }
}
