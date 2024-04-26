import { AuthorizationMiddleware } from '@/middlewares/authorization.middleware';
import { AuthenticationMiddleware } from '@/middlewares/authentication.middleware';
import { UserCompliantMiddleware } from '@/middlewares/userCompliant.middleware';
import { ApiAuthorizationMiddleware } from '@/middlewares/apiAuthorization.middleware';

export const middlewares = [
  AuthorizationMiddleware,
  AuthenticationMiddleware,
  UserCompliantMiddleware,
  ApiAuthorizationMiddleware,
];
