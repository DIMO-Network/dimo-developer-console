export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const app = searchParams.get('app');

  if (app === 'github') {
    const {
      env: { GITHUB_CLIENT_ID: clientId },
    } = process;
    return Response.redirect(
      `https://github.com/login/oauth/authorize?client_id=${clientId}`
    );
  }

  return Response.redirect('/sign-in');
}
