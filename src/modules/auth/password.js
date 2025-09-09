import bcrypt from 'bcryptjs';

export const hashPassword = (plain, rounds = 10) => bcrypt.hash(plain, rounds);
export const verifyPassword = (plain, hash) => bcrypt.compare(plain, hash);