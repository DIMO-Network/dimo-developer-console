import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { UserCompliantMiddleware } from '@/middlewares/user-compliant.middleware';

export const middlewares = [AuthMiddleware, UserCompliantMiddleware];
