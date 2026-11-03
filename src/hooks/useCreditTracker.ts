import { HttpError } from '@/utils/httpError';
import type { ICreditUsage } from '@/types/wallet';

export const useCreditTracker = () => {
  const getUsageByLicense = async ({
    licenseId,
    devJwt,
  }: {
    licenseId: `0x${string}`;
    devJwt: string;
  }): Promise<ICreditUsage> => {
    // The JWT goes in a header: a URL ends up in logs and caches.
    const response = await fetch(
      `/api/credit-usage?licenseId=${encodeURIComponent(licenseId)}`,
      { headers: { 'X-Developer-Jwt': devJwt } },
    );
    if (!response.ok) {
      throw new HttpError(response.status, 'Credit usage unavailable');
    }
    return (await response.json()) as ICreditUsage;
  };

  return {
    getUsageByLicense,
  };
};

export default useCreditTracker;
