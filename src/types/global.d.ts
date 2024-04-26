// global.d.ts
import { NextRequest as OriginalNextRequest } from 'next/server';
import LoggedUser from '@/utils/loggedUser';

declare global {
  declare interface NextRequest extends OriginalNextRequest {
    user?: LoggedUser | null;
  }
}
