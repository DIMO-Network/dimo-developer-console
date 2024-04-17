import { cookies } from 'next/headers';

export async function PUT(request: Request) {
  const data = await request.json();

  if (data?.flow === 'build-for') {
    cookies().set('flow', 'company-information');
  }
  return Response.json({
    status: 'OK',
    message: 'User updated',
  });
}
