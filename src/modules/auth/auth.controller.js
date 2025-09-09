// src/modules/auth/auth.controller.js
import * as authService from './auth.service.js';
import { registerSchema, loginSchema } from './auth.validators.js';

export async function register(req, res, next) {
  try {
    const { body } = registerSchema.parse({ body: req.body });
    const result = await authService.register({ ...body, req, res });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

export async function login(req, res, next) {
  try {
    const { body } = loginSchema.parse({ body: req.body });
    const result = await authService.login({ ...body, req, res });
    res.json(result);
  } catch (e) { next(e); }
}

export async function refresh(req, res, next) {
  try {
    const result = await authService.refresh({ req, res });
    res.json(result); // { token }
  } catch (e) { next(e); }
}

export async function logout(req, res, next) {
  try {
    const result = await authService.logout({ req, res });
    res.json(result);
  } catch (e) { next(e); }
}


export async function me(req, res) {
  // сюда мы попадём только если прошли auth-middleware
  // req.user заполняется в middleware из базы по payload.sub
  res.json({ user: req.user });
}