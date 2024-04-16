import { GoogleAuthService, GitHubAuthService } from '@/services/auth';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params: { app } }: { params: { app: string } }
) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') ?? '';

  const ProviderService = {
    github: GitHubAuthService,
    google: GoogleAuthService,
  }[app];

  if (ProviderService) {
    const providerService = new ProviderService();
    const token = await providerService.processCallback(code);
    const user = await providerService.getUser();

    // TODO: DELETE WHEN JWT IS SET
    cookies().set('logged', 'true', { httpOnly: true });
    cookies().set('token', JSON.stringify(token), { httpOnly: true });
    cookies().set('user', JSON.stringify(user), { httpOnly: true });
  }

  return Response.redirect('http://localhost:3000/');
}
