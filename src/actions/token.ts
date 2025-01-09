'use server';

import { tokenBoughtEmail } from '@/services/token';
import { TokenPurchaseTransaction } from '@/types/crypto';

export const sendTokenBoughtEmail = async (
  token: string,
  transactionData: TokenPurchaseTransaction,
) => {
  return tokenBoughtEmail(token, transactionData);
};
