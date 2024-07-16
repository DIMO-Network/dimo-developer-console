// global.d.ts
import LoggedUser from '@/utils/loggedUser';
import { NextRequestWithAuth } from 'next-auth/middleware';

declare global {
  declare interface NextRequest extends NextRequestWithAuth {
    user?: LoggedUser | null;
  }
}
