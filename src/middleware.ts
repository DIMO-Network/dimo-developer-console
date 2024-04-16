import { NextResponse, type NextRequest } from 'next/server';
import { middlewares } from '@/middlewares/config';

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const nextResponse = NextResponse.next();
  const middlewareFunctions = middlewares.map((fn) => fn(request));

  const middlewareHeader = [];
  for (const middleware of middlewareFunctions) {
    const result = await middleware;

    if (!result.ok) {
      return result;
    }
    middlewareHeader.push(result.headers);

    let redirectTo = null;

    middlewareHeader.some((header) => {
      const redirect = header.get('x-middleware-request-redirect');

      if (redirect) {
        redirectTo = redirect;
        return true;
      }
      return false; // Continue the loop
    });

    if (redirectTo) {
      return NextResponse.redirect(new URL(redirectTo, request.url), {
        status: 307,
      });
    }

    return nextResponse;
  }
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: '/',
};
