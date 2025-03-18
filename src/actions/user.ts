'use server';
import { existUserByEmailOrAddress, getUserByToken } from '@/services/user';
import { createSubOrganization, getUserSubOrganization } from '@/services/globalAccount';
import { ICreateGlobalAccountRequest, ISubOrganization } from '@/types/wallet';

export const getUser = async () => {
  return getUserByToken();
};

export const existUserEmailOrAddress = async (address: string | null) => {
  return existUserByEmailOrAddress(address);
};

export const getUserInformation = async (email: string) => {
  return null;
  // const { existItem, role } = await existUserByEmailOrAddress(email);
  // if (!existItem) {
  //   return null;
  // }

  // const organization = await getUserSubOrganization(email);
  // if (!organization) {
  //   return null;
  // }

  // const { hasPasskey, subOrganizationId } = organization;

  // return {
  //   existsOnDevConsole: existItem,
  //   role,
  //   hasPasskey,
  //   subOrganizationId,
  // };
};

export const createUserGlobalAccount = async (
  request: Partial<ICreateGlobalAccountRequest>,
): Promise<ISubOrganization> => {
  const newOrg = await createSubOrganization(request);
  return newOrg;
};
