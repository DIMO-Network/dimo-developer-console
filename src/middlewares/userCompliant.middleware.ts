import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const UserCompliantMiddleware = async (request: NextRequest) => {
  const urlPath = request.nextUrl.pathname;
  const flow = request.nextUrl.searchParams.get('flow');
  const { value: isLogged } = cookies().get('logged') ?? {}; // TODO: IMPROVE VALIDATION
  const { value: isCompliant } = cookies().get('compliant') ?? {}; // TODO: IMPROVE VALIDATION
  const { value: currentFlow = 'build-for' } = cookies().get('flow') ?? {}; // TODO: IMPROVE VALIDATION
  const header = new Headers();

  if (urlPath.startsWith('/sign-up') && Boolean(isLogged) && !flow) {
    header.set('redirect', `/sign-up?flow=${currentFlow}`);
    return NextResponse.next({
      request: { headers: header },
    });
  } else if (
    !urlPath.startsWith('/sign-up') &&
    Boolean(isLogged) &&
    !isCompliant
  ) {
    header.set('redirect', `/sign-up`);
    return NextResponse.next({
      request: { headers: header },
    });
  } else if (
    urlPath.startsWith('/sign-up') &&
    Boolean(isLogged) &&
    isCompliant
  ) {
    header.set('redirect', `/`);
    return NextResponse.next({
      request: { headers: header },
    });
  }

  return NextResponse.next();
};

export default UserCompliantMiddleware;
