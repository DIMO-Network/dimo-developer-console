import { GoogleAuthService, GitHubAuthService } from '@/services/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const app = searchParams.get('app') ?? '';

  const ProviderService = {
    github: GitHubAuthService,
    google: GoogleAuthService,
  }[app];

  if (ProviderService) {
    const providerService = new ProviderService();
    return Response.redirect(providerService.getOauthURL());
  }

  return Response.redirect('/sign-in');
}
