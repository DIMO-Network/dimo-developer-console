'use server';
import { existUserByEmailOrAddress, getUserByToken } from '@/services/user';
import {
  createSubOrganization,
  getUserSubOrganization,
  rewirePasskey,
  startEmailRecovery,
} from '@/services/globalAccount';
import { ICreateGlobalAccountRequest, ISubOrganization } from '@/types/wallet';
import { TSignedRequest } from '@turnkey/http';
import { cookies } from 'next/headers';
import { cookieName } from '@/services/dimoDevAPI';

export const getUser = async () => {
  return getUserByToken();
};

export const existUserEmailOrAddress = async (address: string | null) => {
  return existUserByEmailOrAddress(address);
};

export const getUserInformation = async (email: string) => {
  const { existItem, role, currentWallet } = await existUserByEmailOrAddress(email);
  if (!existItem) {
    return null;
  }

  const organization = await getUserSubOrganization(email);
  if (!organization) {
    return null;
  }

  const { hasPasskey, subOrganizationId } = organization;

  return {
    existsOnDevConsole: existItem,
    currentWalletAddress: currentWallet,
    role,
    hasPasskey,
    subOrganizationId,
  };
};

export const createUserGlobalAccount = async (
  request: Partial<ICreateGlobalAccountRequest>,
): Promise<ISubOrganization> => createSubOrganization(request);

export const emailRecovery = async (email: string, targetPublicKey: string) => {
  await startEmailRecovery({ email, key: targetPublicKey });
  return true;
};

export const saveNewPasskey = async ({
  email,
  signedRecoveryRequest,
  signedAuthenticatorRemoval,
}: {
  email: string;
  signedRecoveryRequest: TSignedRequest;
  signedAuthenticatorRemoval: TSignedRequest;
}) => {
  await rewirePasskey({
    email,
    signedRecoveryRequest,
    signedAuthenticatorRemoval,
  });
  return true;
};

export const saveToken = async (token: string, sessionExpiration: number) => {
  const userCookies = await cookies();
  userCookies.set(cookieName, token, { maxAge: sessionExpiration });  
};

export const signOut = async () => {
  const userCookies = await cookies();
  userCookies.delete(cookieName);
  return true;
};
