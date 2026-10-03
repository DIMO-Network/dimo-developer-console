'use server';
import config from '@/config';
import axios from 'axios';
import { AxiosError } from 'axios';

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

export type DexResult<T> = { ok: true; data: T } | { ok: false; status: number };

const dexFailure = (error: unknown) => ({
  ok: false as const,
  status: error instanceof AxiosError ? (error.response?.status ?? 0) : 0,
});

// Status-aware versions for the member flow: the client retries only a
// submit_challenge 4xx (dex has not indexed a just-granted signer yet), and a
// thrown error from a server action loses its status in production.
export const requestDexChallenge = async (input: {
  address: `0x${string}`;
  clientId: string;
  domain: string;
}): Promise<DexResult<IAuthChallenge>> => {
  try {
    return { ok: true, data: await getDimoChallenge(input) };
  } catch (error) {
    return dexFailure(error);
  }
};

export const submitDexChallenge = async (input: {
  state: string;
  signedChallenge: string;
  clientId: string;
  domain: string;
}): Promise<DexResult<IAuthResponse>> => {
  try {
    return { ok: true, data: await getDimoToken(input) };
  } catch (error) {
    return dexFailure(error);
  }
};
