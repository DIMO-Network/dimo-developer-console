import { processOauth } from '@/services/auth';
import { cookies } from 'next/headers';

const hasToken = (token: string) => {
  if (!token) {
    throw new Error('Something went wrong');
  }
};

export async function GET(
  request: Request,
  { params: { app } }: { params: { app: string } }
) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') ?? '';

  try {
    const { token } = await processOauth(code, app);
    hasToken(token);

    cookies().set('token', token);
    return Response.redirect('http://localhost:3000/app');
  } catch (error: any) {
    console.error({
      error,
      step: 'OAuth process',
      app,
    });
    return Response.redirect('http://localhost:3000/sign-in?error=true');
  }
}
