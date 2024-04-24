import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

import { loggedUser } from '@/utils/loggedUser';

export const UserCompliantMiddleware = async (request: NextRequest) => {
  const urlPath = request.nextUrl.pathname;
  const flow = request.nextUrl.searchParams.get('flow');
  const isLogged = Boolean(loggedUser.user);
  const isCompliant = loggedUser.isCompliant;

  const { value: currentFlow = 'build-for' } = cookies().get('flow') ?? {}; // TODO: IMPROVE VALIDATION
  const header = new Headers();

  if (urlPath.startsWith('/sign-up') && isLogged && !flow) {
    header.set('redirect', `/sign-up?flow=${currentFlow}`);
    return NextResponse.next({
      request: { headers: header },
    });
  } else if (!urlPath.startsWith('/sign-up') && isLogged && !isCompliant) {
    header.set('redirect', `/sign-up`);
    return NextResponse.next({
      request: { headers: header },
    });
  } else if (urlPath.startsWith('/sign-up') && isLogged && isCompliant) {
    header.set('redirect', `/`);
    return NextResponse.next({
      request: { headers: header },
    });
  }

  return NextResponse.next();
};

export default UserCompliantMiddleware;
