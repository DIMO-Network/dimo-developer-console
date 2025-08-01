'use server';
import axios from 'axios';
import { ICreditUsage } from '@/types/wallet';
import { cookieName, getCookie } from '@/services/dimoDevAPI';

export const getCreditConsumptionByLicense = async ({
  licenseId,
  fromDate,
  toDate,
}: {
  licenseId: string;
  fromDate: string;
  toDate?: string;
}): Promise<ICreditUsage> => {
  let authHeader = undefined;
  const sessionToken = await getCookie(cookieName);
  if (sessionToken) {
    authHeader = `Bearer ${sessionToken}`;
  }

  const dimoApiClient = axios.create({
    baseURL: process.env.CREDIT_TRACKER_URL!,
    timeout: 5 * 60 * 1000,
    headers: {
      Authorization: authHeader,
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
