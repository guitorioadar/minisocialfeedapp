import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';
import { error } from '../utils/apiResponse';

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(error('Authentication required'));
    }

    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json(error('Token not provided'));
    }

    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json(error('Invalid or expired token'));
  }
};
