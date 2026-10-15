import { NextResponse } from 'next/server';

// Per-user data: never stored by Vercel, Cloudflare or the browser.
const PRIVATE = { 'Cache-Control': 'private, no-store' };
import { AxiosError } from 'axios';
import { getUserByToken } from '@/services/user';

// The signed-in user, for useUser. It used to be the getUser server action, but
// Next runs server actions one at a time, and the header asks for the user on
// every page -- so each page's own requests queued behind it. A GET runs
// alongside them.
export const GET = async () => {
  try {
    return NextResponse.json(await getUserByToken(), { headers: PRIVATE });
  } catch (error) {
    const status = error instanceof AxiosError ? (error.response?.status ?? 502) : 500;
    return NextResponse.json(
      { message: 'Could not load the user' },
      { status, headers: PRIVATE },
    );
  }
};
