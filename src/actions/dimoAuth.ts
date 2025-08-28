'use server';
import config from '@/config';
import axios from 'axios';

const client = axios.create({
  baseURL: process.env.JWT_ISSUER!,
  timeout: 5 * 60 * 1000,
});

interface IAuthChallenge {
  state: string;
  challenge: string;
}

interface IAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  id_token: string;
}

export const getDimoChallenge = async ({
  address,
  clientId,
  domain,
}: {
  address: `0x${string}`;
  clientId: string;
  domain: string;
}) => {
  const { data } = await client.post<IAuthChallenge>(
    '/auth/web3/generate_challenge',
    {
      client_id: clientId,
      domain: domain,
      scope: 'openid email',
      response_type: 'code',
      address: address,
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  return data;
};

export const getDimoToken = async ({
  state,
  signedChallenge,
  clientId,
  domain,
}: {
  state: string;
  signedChallenge: string;
  clientId: string;
  domain: string;
}) => {
  console.info({ state, signedChallenge, clientId, domain });

  const { data } = await client.post<IAuthResponse>(
    '/auth/web3/submit_challenge',
    {
      client_id: clientId,
      domain: domain,
      state: state,
      grant_type: 'authorization_code',
      signature: signedChallenge,
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  return data;
};

export const exchangeDimoToken = async (code: string) => {
  const { data } = await client.post<IAuthResponse>(
    '/token',
    {
      client_id: 'developer-platform',
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${config.frontendUrl}sign-in`,
    },
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    },
  );

  return data;
};
