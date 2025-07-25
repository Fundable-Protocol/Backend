import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const JWT_SECRET_STR: string = JWT_SECRET;

import { AuthUser } from '../types/auth';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No token provided',
        details: {},
      },
    });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET_STR);
    // Ensure decoded is an object and has required fields
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      'id' in decoded &&
      'walletAddress' in decoded
    ) {
      req.user = decoded as AuthUser;
      next();
    } else {
      throw new Error('Invalid token payload');
    }
  } catch (err) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
        details: {},
      },
    });
  }
}
