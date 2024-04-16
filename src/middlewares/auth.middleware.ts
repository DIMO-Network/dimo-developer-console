import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const publicEndpoints = ['/sign-in', '/sign-up'];

export const AuthMiddleware = async (request: NextRequest) => {
  const url = request.nextUrl.pathname;
  const isPublicPath = publicEndpoints.some((path) => url.startsWith(path));
  const { value: isLogged } = cookies().get('logged') ?? {}; // TODO: IMPROVE VALIDATION
  const header = new Headers();

  if (!isPublicPath && !isLogged) {
    header.set('redirect', '/sign-in');
    return NextResponse.next({
      request: { headers: header },
    });
  }

  return NextResponse.next();
};

export default AuthMiddleware;
