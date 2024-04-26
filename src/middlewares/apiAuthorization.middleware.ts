import { NextResponse } from 'next/server';

import { isIn } from '@/utils/middlewareUtils';

const API_PATH = '/api';
const UNPROTECTED_PATHS = ['/api/auth'];

const mustBeAuthorize = (request: NextRequest) => {
  const url = request.nextUrl.pathname;
  const isLogged = Boolean(request.user);

  const isAPI = url.startsWith(API_PATH);
  const isPublicPath = UNPROTECTED_PATHS.some(isIn(url));
  return isAPI && !isPublicPath && !isLogged;
};

export const ApiAuthorizationMiddleware = async (request: NextRequest) => {
  if (mustBeAuthorize(request)) {
    return NextResponse.json(
      {
        message: 'Unauthorized Access',
      },
      { status: 401 }
    );
  }

  return NextResponse.next();
};

export default ApiAuthorizationMiddleware;
