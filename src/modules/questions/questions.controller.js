import { listQuestions } from './questions.service.js';

export async function list(req, res, next) {
  try {
    const { page, limit, category, q } = req.query;
    const data = await listQuestions({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      category,
      q
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
}
