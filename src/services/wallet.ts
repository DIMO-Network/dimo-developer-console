'use server';
import { ICoinMarketTokenResponse } from '@/types/wallet';
import { unstable_cache } from 'next/cache';
import xior from 'xior';
import config from '@/config';

const dimoApiClient = xior.create({
  baseURL: config.backendUrl,
});

const getCurrentDimoPrice = async (): Promise<number> => {
  const { data } = await dimoApiClient.get<ICoinMarketTokenResponse>('/api/crypto');
  return data.data.DIMO[0].quote.USD.price;
};

export const getCachedDimoPrice = unstable_cache(async () => {
    return await getCurrentDimoPrice();
  },
  ['dimo-price'],
  { revalidate: 60 * 60 * 24, tags: ['dimo-price'] });