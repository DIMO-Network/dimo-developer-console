import { updateLoggedUser } from '@/services/user';

export async function PUT(request: Request) {
  const { flow = 'sign-up-with', data = {} } = await request.json();

  console.log({ flow, data });

  if (flow === 'build-for') {
    await updateLoggedUser({
      build_for: data?.buildFor,
      build_for_text: data?.buildForText,
    });
  }
  if (flow === 'company-info') {
    await updateLoggedUser({
      company_name: data?.name,
      company_region: data?.region,
      company_website: data?.website,
    });
  }
  return Response.json({
    status: 'OK',
    message: 'User updated',
  });
}
