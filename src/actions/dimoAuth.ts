'use server';
import config from '@/config';
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
      domain: `${config.frontendUrl}sign-in`,
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
      domain: `${config.frontendUrl}sign-in`,
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

export const exchangeDimoToken = async (code: string) => {
  const response = await fetch(`${process.env.JWT_ISSUER}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: 'developer-platform',
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${config.frontendUrl}sign-in`,
    }),
  });

  if (!response.ok) {
    throw new Error('Error exchanging token');
  }
  return (await response.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
    id_token: string;
  };
};
