'use server';
import { ICoinMarketTokenResponse } from '@/types/wallet';
import xior from 'xior';
import config from '@/config';

const dimoApiClient = xior.create({
  baseURL: config.backendUrl,
});

export const getCurrentDimoPrice = async (): Promise<number> => {
  'use cache'
  const { data } =
    await dimoApiClient.get<ICoinMarketTokenResponse>('/api/crypto/DIMO');
  return data.data.DIMO[0].quote.USD.price;
};

export const getCurrentPolPrice = async (): Promise<number> => {
  'use cache'
  const { data } =
    await dimoApiClient.get<ICoinMarketTokenResponse>('/api/crypto/POL');
  return data.data.POL[0].quote.USD.price;
};

export const getCurrentWMaticPrice = async (): Promise<number> => {
  'use cache'
  const { data } =
    await dimoApiClient.get<ICoinMarketTokenResponse>('/api/crypto/WMATIC');  
  return data.data.WMATIC[0].quote.USD.price;
};