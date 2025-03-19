// global.d.ts
import LoggedUser from '@/utils/loggedUser';
import { NextRequest as OriginalNextRequest } from 'next/server';

declare global {
  declare interface NextRequest extends OriginalNextRequest {
    user?: LoggedUser | null;
  }
}
