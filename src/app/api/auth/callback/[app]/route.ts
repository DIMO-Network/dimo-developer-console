import { GoogleAuthService, GitHubAuthService } from '@/services/auth';

export async function GET(
  request: Request,
  { params: { app } }: { params: { app: string } }
) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') ?? '';

  if (app === 'github') {
    const githubService = new GitHubAuthService();
    await githubService.processCallback(code);
    const user = await githubService.getUser();
    console.log({ user });
  }

  if (app === 'google') {
    const googleService = new GoogleAuthService();
    await googleService.processCallback(code);
    const user = await googleService.getUser();
    console.log(user);
  }

  return Response.redirect('http://localhost:3000/sign-in');
}
