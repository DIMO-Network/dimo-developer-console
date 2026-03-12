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
    timeout: 5 * 60 * 1000,
    headers: {
      Authorization: `Bearer ${devJwt}`,
    },
  });

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
};
