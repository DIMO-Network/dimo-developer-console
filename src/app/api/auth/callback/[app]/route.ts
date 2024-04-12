import { GoogleAuthService, GitHubAuthService } from '@/services/auth';

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
    console.log({ token, user });
  }

  return Response.redirect('http://localhost:3000/sign-in');
}
