import { NextResponse } from 'next/server';
import { AxiosError } from 'axios';
import { getUserByToken } from '@/services/user';

// The signed-in user, for useUser. It used to be the getUser server action, but
// Next runs server actions one at a time, and the header asks for the user on
// every page -- so each page's own requests queued behind it. A GET runs
// alongside them.
export const GET = async () => {
  try {
    return NextResponse.json(await getUserByToken());
  } catch (error) {
    const status = error instanceof AxiosError ? (error.response?.status ?? 502) : 500;
    return NextResponse.json({ message: 'Could not load the user' }, { status });
  }
};
