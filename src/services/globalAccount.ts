import config from '@/config';
import { ISubOrganization, ICreateGlobalAccountRequest } from '@/types/wallet';
import { TSignedRequest } from '@turnkey/http';
import axios, { AxiosError } from 'axios';

const globalAccountClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GA_API!,
  timeout: 5*60*1000,
});

export const getUserSubOrganization = async (
  email: string,
): Promise<ISubOrganization | null> => {
  try {
    const { data } = await globalAccountClient.get<ISubOrganization>(
      `/api/account/${encodeURIComponent(email)}`,
    );
    return { ...data, email: email };
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        return null;
      }
    }
    throw error;
  }
};

export const createSubOrganization = async (
  walletInfo: Partial<ICreateGlobalAccountRequest>,
): Promise<ISubOrganization> => {
  const { data } = await globalAccountClient.post<ISubOrganization>(
    '/api/account',
    walletInfo,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  return data;
};

export const startEmailRecovery = async ({
  email,
  key,
}: {
  email: string;
  key: string;
}): Promise<void> => {
  await globalAccountClient.post(
    `/api/account/recovery`,
    {
      email,
      key,
      origin: 'DIMO Developer Console',
      redirectUrl: getRedirectUrl(email),
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
};

export const rewirePasskey = async ({
  email,
  signedRecoveryRequest,
  signedAuthenticatorRemoval,
}: {
  email: string;
  signedRecoveryRequest: TSignedRequest;
  signedAuthenticatorRemoval: TSignedRequest;
}) => {
  await globalAccountClient.put(
    `/api/account/recovery`,
    {
      email,
      signedRecoveryRequest,
      signedAuthenticatorRemoval,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
};

export const initOtpLogin = async (email: string): Promise<{ otpId: string }> => {
  const { data } = await globalAccountClient.post<{ otpId: string }>(
    '/api/auth/otp',
    {
      email,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  return data;
};

export const otpLogin = async (otpVars: {
  email: string;
  otpId: string;
  otpCode: string;
  key: string;
}): Promise<{ credentialBundle: string }> => {
  const { data } = await globalAccountClient.put<{ credentialBundle: string }>(
    '/api/auth/otp',
    otpVars,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
  return data;
};

// private functions
const getRedirectUrl = (email: string) => {
  return `${config.frontendUrl}email-recovery?flow=rewire-passkey&email=${email}`;
};
