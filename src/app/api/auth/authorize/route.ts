import { GoogleAuthService, GitHubAuthService } from '@/services/auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const app = searchParams.get('app');

  if (app === 'github') {
    const githubService = new GitHubAuthService();
    return Response.redirect(githubService.getOauthURL());
  }

  if (app === 'google') {
    const googleService = new GoogleAuthService();
    return Response.redirect(googleService.getOauthURL());
  }

  return Response.redirect('/sign-in');
}
