'use server';
import { existUserByAddress, getUserByToken } from '@/services/user';

export const getUser = async () => {
  return getUserByToken();
};

export const existUserAddress = async (address: string | null) => {
  return existUserByAddress(address);
};
