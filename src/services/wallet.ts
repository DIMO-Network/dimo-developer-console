'use server';
import { ICoinMarketTokenResponse } from '@/types/wallet';
import { unstable_cache } from 'next/cache';
import xior from 'xior';
import config from '@/config';

const dimoApiClient = xior.create({
  baseURL: config.backendUrl,
});

const getCurrentDimoPrice = async (): Promise<number> => {
  const { data } =
    await dimoApiClient.get<ICoinMarketTokenResponse>('/api/crypto/DIMO');
  return data.data.DIMO[0].quote.USD.price;
};

const getCurrentPolPrice = async (): Promise<number> => {
  const { data } =
    await dimoApiClient.get<ICoinMarketTokenResponse>('/api/crypto/POL');
  return data.data.POL[0].quote.USD.price;
};

const getCurrentWMaticPrice = async (): Promise<number> => {
  const { data } =
    await dimoApiClient.get<ICoinMarketTokenResponse>('/api/crypto/WMATIC');
  console.info(data);
  return data.data.WMATIC[0].quote.USD.price;
};

export const getCachedDimoPrice = unstable_cache(
  async () => {
    return await getCurrentDimoPrice();
  },
  ['dimo-price'],
  { revalidate: 60 * 60 * 24, tags: ['dimo-price'] },
);

export const getCachedPolPrice = unstable_cache(
  async () => {
    return await getCurrentPolPrice();
  },
  ['pol-price'],
  { revalidate: 60 * 60 * 24, tags: ['pol-price'] },
);

export const getCachedWmaticPrice = unstable_cache(
  async () => {
    return await getCurrentWMaticPrice();
  },
  ['wmatic-price'],
  { revalidate: 60 * 60 * 24, tags: ['wmatic-price'] },
);
