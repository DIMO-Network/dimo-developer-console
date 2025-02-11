'use server';
import { ICoinMarketTokenResponse } from '@/types/wallet';
import { unstable_cache as cache } from 'next/cache';
import axios from 'axios';
import config from '@/config';

const dimoApiClient = axios.create({
  baseURL: config.backendUrl,
});

const getCurrentDimoPrice = async (): Promise<number> => {
  const { data } = await dimoApiClient.get<ICoinMarketTokenResponse>('/api/crypto/DIMO');
  return data.data.DIMO[0].quote.USD.price;
};

const getCurrentPolPrice = async (): Promise<number> => {
  const { data } = await dimoApiClient.get<ICoinMarketTokenResponse>('/api/crypto/POL');
  return data.data.POL[0].quote.USD.price;
};

const getCurrentWMaticPrice = async (): Promise<number> => {
  const { data } =
    await dimoApiClient.get<ICoinMarketTokenResponse>('/api/crypto/WMATIC');  
  return data.data.WMATIC[0].quote.USD.price;
};

const oneHour = 60 * 60 * 1;

export const getCachedDimoPrice = cache(
  async () => {
    return await getCurrentDimoPrice();
  },
  ['dimo-price'],
  { revalidate: oneHour, tags: ['dimo-price'] },
);

export const getCachedPolPrice = cache(
  async () => {
    return await getCurrentPolPrice();
  },
  ['pol-price'],
  { revalidate: oneHour, tags: ['pol-price'] },
);

export const getCachedWmaticPrice = cache(
  async () => {
    return await getCurrentWMaticPrice();
  },
  ['wmatic-price'],
  { revalidate: oneHour, tags: ['wmatic-price'] },
);
