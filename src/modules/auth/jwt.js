// src/modules/auth/jwt.js
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const {
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  JWT_ACCESS_TTL = '15m',
  JWT_REFRESH_TTL = '30d',
} = process.env;

export function signAccess(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_TTL });
}

export function signRefresh(payload) {
  // добавим уникальный jti (ID токена) — положим в payload
  const jti = crypto.randomUUID();
  const token = jwt.sign({ ...payload, jti }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_TTL,
  });
  return { token, jti };
}

export function verifyAccess(token) {
  return jwt.verify(token, JWT_SECRET); // выбрасывает ошибку если невалиден
}

export function verifyRefresh(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}
