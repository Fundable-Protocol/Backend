import { AuthUser } from '../../appMiddlewares/auth.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
