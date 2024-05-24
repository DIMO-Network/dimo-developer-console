import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const GET = (request: NextRequest) => {
  cookies().delete('token');
  return NextResponse.redirect(new URL('/sign-in', request.url));
};
