'use server';
import { getUserByToken } from '@/services/user';

export const getUser = async () => {
  return getUserByToken();
};
