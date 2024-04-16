import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const UserCompliantMiddleware = async (request: NextRequest) => {
  const urlPath = request.nextUrl.pathname;
  const flow = request.nextUrl.searchParams.get('flow');
  const { value: isLogged } = cookies().get('logged') ?? {}; // TODO: IMPROVE VALIDATION
  const header = new Headers();

  if (urlPath.startsWith('/sign-up') && Boolean(isLogged) && !flow) {
    header.set('redirect', '/sign-up?flow=build-for');
    return NextResponse.next({
      request: { headers: header },
    });
  }

  return NextResponse.next();
};

export default UserCompliantMiddleware;
