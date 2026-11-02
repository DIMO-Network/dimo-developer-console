const mockGet = jest.fn();
jest.mock('axios', () => ({
  __esModule: true,
  default: { create: () => ({ get: mockGet }) },
}));
import { getCreditConsumptionByLicense } from '@/services/creditTracker';

describe('getCreditConsumptionByLicense', () => {
  it('lets a failure through, so an outage never reads as zero usage', async () => {
    mockGet.mockRejectedValue(new Error('502'));

    await expect(
      getCreditConsumptionByLicense({
        licenseId: '0xabc',
        fromDate: 'a',
        toDate: 'b',
        devJwt: 'dev.jwt',
      }),
    ).rejects.toThrow('502');
  });
});
