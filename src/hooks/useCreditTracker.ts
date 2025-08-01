import { getCreditConsumptionByLicense } from '@/services/creditTracker';

export const useCreditTracker = () => {
  const getUsageByLicense = async (licenseId: string | number) => {
    const fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1); // Default to one month ago
    const toDate = new Date(); // Default to today

    return await getCreditConsumptionByLicense({
      licenseId,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
    });
  };

  return {
    getUsageByLicense,
  };
};

export default useCreditTracker;
