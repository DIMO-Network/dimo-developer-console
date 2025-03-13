'use server';
import { existUserByEmailOrAddress, getUserByToken } from '@/services/user';
import { getUserSubOrganization } from '@/services/globalAccount';

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
