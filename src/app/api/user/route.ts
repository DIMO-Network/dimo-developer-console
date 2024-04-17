import { cookies } from 'next/headers';

export async function PUT(request: Request) {
  const data = await request.json();

  if (data?.flow === 'build-for') {
    cookies().set('flow', 'company-information');
  }
  if (data?.flow === 'company-info') {
    cookies().set('compliant', 'true');
  }
  return Response.json({
    status: 'OK',
    message: 'User updated',
  });
}
