import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { UserCompliantMiddleware } from '@/middlewares/userCompliant.middleware';

export const middlewares = [AuthMiddleware, UserCompliantMiddleware];
