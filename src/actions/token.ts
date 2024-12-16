'use server';

import { tokenBoughtEmail } from '@/services/token';

export const sendTokenBoughtEmail = async (token: string, amount: bigint) => {
  return tokenBoughtEmail(token, { amount });
};
