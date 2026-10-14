import jwt from 'jsonwebtoken';

export const generateToken = (payload, expiresIn = '30d') => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'shippnex_secret', {
    expiresIn,
  });
};
