import { cookies } from 'next/headers';

import { processOauth } from '@/services/auth';

const hasToken = (token: string) => {
  if (!token) {
    throw new Error('Something went wrong');
  }
};

export async function GET(
  request: Request,
  { params: { app } }: { params: { app: string } }
) {
  const { searchParams, host } = new URL(request.url);
  const code = searchParams.get('code') ?? '';

  try {
    console.log({ code, app });
    const { token } = await processOauth(code, app, host);
    hasToken(token);

    cookies().set('token', token);
    return Response.redirect(`https://${host}/app`);
  } catch (error: unknown) {
    console.error({
      error,
      step: 'OAuth process',
      app,
    });
    return Response.redirect(`https://${host}/sign-in?error=unique_email`);
  }
}
