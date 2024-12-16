import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IApp } from '@/types/app';

export const tokenBoughtEmail = async (
  token: string,
  transaction: { amount: bigint },
) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<IApp>(`/api/crypto/${token}`, transaction);
  return data;
};
