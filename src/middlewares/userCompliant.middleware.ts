import { NextRequest, NextResponse } from 'next/server';

import { loggedUser } from '@/utils/loggedUser';

enum AUTH_PATHS {
  SIGN_UP = '/sign-up',
  SIGN_IN = '/sign-in',
}

const isCompletingRegistration = (urlPath: string, flow: string | null) =>
  Boolean(urlPath.startsWith(AUTH_PATHS.SIGN_UP) && flow);

const mustCompleteData = (isCompliant: boolean, isCompletingData: boolean) =>
  Boolean(!isCompliant && !isCompletingData);

const isReadyToUseTheApp = (urlPath: string, isCompliant: boolean) => {
  const authPaths = [AUTH_PATHS.SIGN_UP, AUTH_PATHS.SIGN_IN];
  const isAuthPath = authPaths.some((path) => urlPath.startsWith(path));
  return Boolean(isAuthPath && isCompliant);
};

export const UserCompliantMiddleware = async (request: NextRequest) => {
  const urlPath = request.nextUrl.pathname;
  const flow = request.nextUrl.searchParams.get('flow');
  const missingFlow = loggedUser.missingFlow;
  const isCompliant = loggedUser.isCompliant;
  const isCompletingData = isCompletingRegistration(urlPath, flow);

  const header = new Headers();

  if (mustCompleteData(isCompliant, isCompletingData)) {
    header.set('redirect', `${AUTH_PATHS.SIGN_UP}?flow=${missingFlow}`);
  } else if (isReadyToUseTheApp(urlPath, isCompliant)) {
    header.set('redirect', `/app`);
  }

  return NextResponse.next({
    request: { headers: header },
  });
};

export default UserCompliantMiddleware;
