'use server';
import axios, { AxiosError } from 'axios';
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
  } catch (error) {
    // Next logs what an action throws and onRequestError ships it to Sentry, and an
    // AxiosError holds the dev JWT in config.headers and in the raw request. Only the
    // status leaves here. It still rejects: a failure must not read as zero usage.
    const status = error instanceof AxiosError ? error.response?.status : undefined;
    throw new Error(`Credit usage request failed (${status ?? 'no response'})`);
  }
};
