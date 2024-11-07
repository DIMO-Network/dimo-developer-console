import { ICoinMarketTokenResponse, ISubOrganization, IWalletSubOrganization } from '@/types/wallet';
import { TSignedRequest } from '@turnkey/http';
import xior, { XiorError } from 'xior';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

const globalAccountClient = xior.create({
  baseURL: process.env.NEXT_PUBLIC_GA_API!,
});

// public functions

export const getUserSubOrganization = async (
  email: string,
): Promise<ISubOrganization> => {
  try {
    const { data } = await globalAccountClient.get(`/api/account/${email}`);
    return data;
  } catch (error) {
    if (error instanceof XiorError) {
      if (error.response?.status === 404) {
        return {} as ISubOrganization;
      }
    }
    throw error;
  }
};

export const createSubOrganization = async (
  walletInfo: Partial<IWalletSubOrganization>,
): Promise<ISubOrganization> => {
  const { data } = await globalAccountClient.post('/api/account', walletInfo, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
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
      redirectUrl: getRedirectUrl(),
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
};

export const rewirePasskey = async ({
  signedRecoveryRequest,
  signedAuthenticatorRemoval,
}: {
  signedRecoveryRequest: TSignedRequest;
  signedAuthenticatorRemoval: TSignedRequest;
}) => {
  await globalAccountClient.put(
    `/api/account/recovery`,
    {
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

// private functions
const getRedirectUrl = () => {
  return `${window.location.origin}/email-recovery?flow=rewire-passkey`;
};
