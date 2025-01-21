'use server';
import { existUserByEmailOrAddress, getUserByToken } from '@/services/user';

export const getUser = async () => {
  return getUserByToken();
};

export const existUserEmailOrAddress = async (
  address: string | null,
) => {
  return existUserByEmailOrAddress(address);
};
