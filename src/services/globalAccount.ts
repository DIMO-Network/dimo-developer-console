import { ICoinMarketTokenResponse, ISubOrganization, IWalletSubOrganization } from '@/types/wallet';
import { TSignedRequest } from '@turnkey/http';
import xior, { XiorError } from 'xior';
import cachePlugin from 'xior/plugins/cache';

const globalAccountClient = xior.create({
  baseURL: process.env.NEXT_PUBLIC_GA_API!,
});

const coinMarketCapClient = xior.create({
  baseURL: process.env.NEXT_PUBLIC_COINMARKET_API!,
  cache: 'default',
});
coinMarketCapClient.plugins.use(cachePlugin());

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

export const getCurrentDimoPrice = async (): Promise<number> => {
  const { data } = await coinMarketCapClient.get<ICoinMarketTokenResponse>('v2/cryptocurrency/quotes/latest?symbol=DIMO', {
    headers: {
      'X-CMC_PRO_API_KEY': process.env.NEXT_PUBLIC_COINMARKET_API_KEY!,
    }
  });
  return data.data.DIMO[0].quote.USD.price;
};

// private functions
const getRedirectUrl = () => {
  return `${window.location.origin}/email-recovery?flow=rewire-passkey`;
};
