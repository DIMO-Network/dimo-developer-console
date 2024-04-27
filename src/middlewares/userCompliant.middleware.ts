import { NextResponse } from 'next/server';

import { isIn } from '@/utils/middlewareUtils';

enum AUTH_PATHS {
  SIGN_UP = '/sign-up',
  SIGN_IN = '/sign-in',
}

const EXCLUDED_PATHS = ['/api'];

const isCompletingRegistration = (urlPath: string, flow: string | null) =>
  Boolean(urlPath.startsWith(AUTH_PATHS.SIGN_UP) && flow);

const mustCompleteData = (request: NextRequest, isCompletingData: boolean) => {
  const isLogged = Boolean(request.user);
  const isCompliant = request.user?.isCompliant;
  return isLogged && Boolean(!isCompliant && !isCompletingData);
};

const isReadyToUseTheApp = (request: NextRequest, urlPath: string) => {
  const isCompliant = request.user?.isCompliant;
  const authPaths = [AUTH_PATHS.SIGN_UP, AUTH_PATHS.SIGN_IN];
  const isAuthPath = authPaths.some(isIn(urlPath));
  return Boolean(isAuthPath && isCompliant);
};

export const UserCompliantMiddleware = async (request: NextRequest) => {
  const urlPath = request.nextUrl.pathname;
  const flow = request.nextUrl.searchParams.get('flow');
  const missingFlow = request.user?.missingFlow;
  const isCompletingData = isCompletingRegistration(urlPath, flow);

  const header = new Headers();

  if (!EXCLUDED_PATHS.some(isIn(urlPath)))
    if (mustCompleteData(request, isCompletingData)) {
      header.set('redirect', `${AUTH_PATHS.SIGN_UP}?flow=${missingFlow}`);
    } else if (isReadyToUseTheApp(request, urlPath)) {
      header.set('redirect', `/app`);
    }

  return NextResponse.next({
    request: { headers: header },
  });
};

export default UserCompliantMiddleware;
