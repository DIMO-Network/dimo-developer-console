'use client';
import axios, { AxiosError } from 'axios';
import { ISubOrganization, IWalletSubOrganization } from '@/types/wallet';

const globalAccountClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_GA_API!,
});

// public functions

export const getUserSubOrganization = async (
  email: string,
): Promise<ISubOrganization> => {
  try {
    const { data } = await globalAccountClient.get(`/api/account/${email}`);
    return data;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 404) {
        return {} as ISubOrganization;
      }
    }
    throw error;
  }
};

export const createSubOrganization = async (
  walletInfo: Partial<IWalletSubOrganization>,
): Promise<ISubOrganization> => {
  const { data } = await globalAccountClient.post('/api/account', walletInfo, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return data;
};

// private functions
