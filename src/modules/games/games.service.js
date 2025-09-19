// src/modules/games/games.service.js
import { prisma } from '../../config/prisma.js';

export const GamesService = {
  async create({ meId, opponentId }) {
    const opp = await prisma.user.findUnique({ where: { id: opponentId } });
    if (!opp) {
      const e = new Error('Opponent not found');
      e.status = 404;
      throw e;
    }
    return prisma.game.create({
      data: { player1Id: meId, player2Id: opponentId, status: 'pending' },
      select: { id: true, player1Id: true, player2Id: true, status: true, createdAt: true }
    });
  },

  async accept({ meId, gameId, durationSec = 60, questionsPerRound = 5 }) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game || game.status !== 'pending') {
      const e = new Error('Game not found');
      e.status = 404;
      throw e;
    }
    if (game.player2Id !== meId) {
      const e = new Error('Only opponent can accept');
      e.status = 403;
      throw e;
    }

    await prisma.game.update({ where: { id: gameId }, data: { status: 'in_progress' } });

    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + durationSec * 1000);
    const playerId = Math.random() < 0.5 ? game.player1Id : game.player2Id;

    const round = await prisma.round.create({
      data: { gameId, number: 1, playerId, status: 'in_progress', startAt, endAt }
    });

    const count = await prisma.question.count();
    const take = Math.min(questionsPerRound, Math.max(count, 1));
    const skip = count > take ? Math.floor(Math.random() * (count - take)) : 0;
    const qs = await prisma.question.findMany({ take, skip, orderBy: { id: 'asc' }, select: { id: true } });

    if (qs.length) {
      await prisma.roundQuestion.createMany({
        data: qs.map((q, i) => ({ roundId: round.id, questionId: q.id, position: i + 1 }))
      });
    }

    return { gameId, roundId: round.id };
  },

  async decline({ meId, gameId }) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game || game.status !== 'pending') {
      const e = new Error('Game not found');
      e.status = 404;
      throw e;
    }
    if (game.player2Id !== meId) {
      const e = new Error('Only opponent can decline');
      e.status = 403;
      throw e;
    }
    await prisma.game.update({ where: { id: gameId }, data: { status: 'canceled' } });
    return true;
  },

  list({ meId, status }) {
    return prisma.game.findMany({
      where: {
        AND: [
          status ? { status } : {},
          { OR: [{ player1Id: meId }, { player2Id: meId }] }
        ]
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, createdAt: true, player1Id: true, player2Id: true }
    });
  },

  async getById({ meId, gameId }) {
    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        rounds: {
          orderBy: { number: 'asc' },
          include: {
            questions: { include: { question: { select: { id: true, text: true } } } }
          }
        }
      }
    });
    if (!game || (game.player1Id !== meId && game.player2Id !== meId)) {
      const e = new Error('Not found');
      e.status = 404;
      throw e;
    }
    return game;
  },

  async submitAnswers({ meId, gameId, answers }) {
    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game || game.status !== 'in_progress') {
      const e = new Error('Game not found');
      e.status = 404;
      throw e;
    }
    if (game.player1Id !== meId && game.player2Id !== meId) {
      const e = new Error('Forbidden');
      e.status = 403;
      throw e;
    }

    const round = await prisma.round.findFirst({
      where: { gameId, status: 'in_progress' },
      include: { questions: true }
    });
    if (!round) {
      const e = new Error('No active round');
      e.status = 400;
      throw e;
    }
    if (round.endAt && new Date() > round.endAt) {
      const e = new Error('Round expired');
      e.status = 400;
      throw e;
    }

    const allowedQ = new Set(round.questions.map(q => q.questionId));

    for (const a of answers) {
      const qId = Number(a.questionId);
      const optId = a.optionId ? Number(a.optionId) : null;
      if (!allowedQ.has(qId)) continue;

      let isCorrect = null;
      if (optId) {
        const opt = await prisma.answerOption.findUnique({ where: { id: optId } });
        isCorrect = opt ? !!opt.isCorrect : null;
      }

      await prisma.answer.upsert({
        where: { userId_roundId_questionId: { userId: meId, roundId: round.id, questionId: qId } },
        update: { optionId: optId, isCorrect, elapsedMs: a.elapsedMs ?? null },
        create: { userId: meId, roundId: round.id, questionId: qId, optionId: optId, isCorrect, elapsedMs: a.elapsedMs ?? null }
      });
    }

    const [a1, a2, total] = await Promise.all([
      prisma.answer.count({ where: { roundId: round.id, userId: game.player1Id } }),
      prisma.answer.count({ where: { roundId: round.id, userId: game.player2Id } }),
      prisma.roundQuestion.count({ where: { roundId: round.id } }),
    ]);

    const bothDone = a1 >= total && a2 >= total;

    if (bothDone) {
      await prisma.round.update({ where: { id: round.id }, data: { status: 'finished', endAt: new Date() } });
      await prisma.game.update({ where: { id: game.id }, data: { status: 'finished' } });
      // TODO: начислить статы, создать следующий раунд, если нужен
    }

    return { bothDone };
  },
};
