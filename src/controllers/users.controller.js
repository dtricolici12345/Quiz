// src/controllers/users.controller.js
import * as usersService from '../services/users.service.js';

/**
 * GET /api/users
 * Публичный список с пагинацией/поиском/сортировкой
 * Параметры: ?page&limit&q&sort=rating|createdAt&order=asc|desc
 */
export async function list(req, res, next) {
  try {
    const { page, limit, q, sort, order } = req.query;
    const data = await usersService.listUsers({
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      q,
      sort,
      order,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

/**
 * GET /api/users/:id
 * Публичная карточка пользователя
 */
export async function getById(req, res, next) {
  try {
    const id = Number(req.params.id);
    const user = await usersService.getUserById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) {
    next(e);
  }
}

/**
 * PATCH /api/users/me
 * Обновление своего профиля (nickname, avatarUrl)
 * Требуется auth-middleware
 */
export async function updateMe(req, res, next) {
  try {
    const updated = await usersService.updateMe(req.user.id, req.body);
    res.json({ user: updated });
  } catch (e) {
    if (e.code === 'P2002' || e.message === 'Nickname already exists') {
      return res.status(409).json({ error: 'Nickname already exists' });
    }
    next(e);
  }
}

/**
 * PATCH /api/users/me/password
 * Смена пароля (oldPassword -> newPassword)
 * Требуется auth-middleware
 */
export async function changePassword(req, res, next) {
  try {
    const result = await usersService.changePassword(req.user.id, req.body);
    res.json(result); // { changed: true }
  } catch (e) {
    if (e.message === 'Wrong old password') {
      return res.status(400).json({ error: e.message });
    }
    if (e.message === 'User not found') {
      return res.status(404).json({ error: e.message });
    }
    next(e);
  }
}

/**
 * DELETE /api/users/me
 */
export async function deleteMe(req, res, next) {
  try {
    await usersService.anonymizeUser(req.user.id);
    res.status(200).json({ ok: true });
  } catch (e) {
    next(e);
  }
}
/* ---- НЕ НУЖНО в проде: старый createUser для тестов ----
   Регистрировать теперь через /api/auth/register.
   Оставь закомментированным, либо повесь на роль admin.
*/
// export async function createUser(req, res, next) {
//   try {
//     const { email, nickname } = req.body;
//     if (!email) return res.status(400).json({ error: 'email is required' });
//     const user = await usersService.createUser({ email, nickname }); // временный метод
//     res.status(201).json(user);
//   } catch (e) {
//     if (e.code === 'P2002') {
//       return res.status(409).json({ error: 'email or nickname already exists' });
//     }
//     next(e);
//   }
// }
