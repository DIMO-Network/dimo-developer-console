'use server';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IApp } from '@/types/app';
import { TokenPurchaseTransaction } from '@/types/crypto';

export const tokenBoughtEmail = async (
  token: string,
  transaction: TokenPurchaseTransaction,
) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<IApp>(`/api/crypto/${token}`, transaction);
  return data;
};

export const generatePaymentLink = async (amount: number) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<{ id: string; url: string }>('/api/crypto/payment', {
    amount,
  });
  return data;
};
