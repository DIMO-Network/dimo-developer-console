'use server';
export const getDimoChallenge = async (address: string) => {
  const response = await fetch(`${process.env.JWT_ISSUER}/auth/web3/generate_challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      scope: 'openid email',
      response_type: 'code',
      client_id: 'developer-platform',
      domain: 'http://localhost:8002/oauth/callback',
      address: address,
    }),
  });

  if (!response.ok) {
    throw new Error('Error generating challenge');
  }

  return (await response.json()) as { challenge: string; state: string };
};

export const getDimoToken = async (state: string, signedChallenge: string) => {
  const response = await fetch(`${process.env.JWT_ISSUER}/auth/web3/submit_challenge`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: 'developer-platform',
      domain: 'http://localhost:8002/oauth/callback',
      state: state,
      grant_type: 'authorization_code',
      signature: signedChallenge,
    }),
  });

  if (!response.ok) {
    throw new Error('Error generating token');
  }

  return (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    id_token: string;
  };
};
