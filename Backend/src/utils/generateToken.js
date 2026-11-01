import jwt from 'jsonwebtoken';
import { getJwtSecret, JWT_ALGORITHMS } from './jwtConfig.js';

export const generateToken = (payload, expiresIn = '30d') => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
    algorithm: JWT_ALGORITHMS[0],
  });
};
