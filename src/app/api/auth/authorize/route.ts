import { GoogleAuthService, GitHubAuthService } from '@/services/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const app = searchParams.get('app') ?? '';

  const ProviderService = {
    github: GitHubAuthService,
    google: GoogleAuthService,
  }[app];

  if (ProviderService) {
    const url = new URL(request.url);
    console.log({ url: url.host });
    const providerService = new ProviderService(`https://${url.host}/`);
    return Response.redirect(providerService.getOauthURL());
  }

  return Response.redirect('/sign-in');
}
