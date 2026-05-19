'use server';
import axios from 'axios';
import { ICreditUsage } from '@/types/wallet';

export const getCreditConsumptionByLicense = async ({
  licenseId,
  fromDate,
  toDate,
  devJwt,
}: {
  licenseId: `0x${string}`;
  fromDate: string;
  toDate?: string;
  devJwt: string;
}): Promise<ICreditUsage> => {
  const dimoApiClient = axios.create({
    baseURL: process.env.CREDIT_TRACKER_URL!,
    timeout: 10_000,
    headers: {
      Authorization: `Bearer ${devJwt}`,
    },
  });

  try {
    const { data } = await dimoApiClient.get<ICreditUsage>(
      `/v1/credits/${licenseId}/usage`,
      {
        params: {
          fromDate,
          toDate,
        },
      },
    );
    return data;
  } catch {
    return {
      fromDate,
      toDate: toDate ?? '',
      licenseId,
      numOfAssets: 0,
      numOfCreditsGrantsPurchased: 0,
      numOfCreditsUsed: 0,
    };
  }
};
