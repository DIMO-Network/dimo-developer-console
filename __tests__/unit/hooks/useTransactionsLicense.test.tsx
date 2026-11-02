import { renderHook } from '@testing-library/react';

const mockProcess = jest.fn();
const mockBalance = jest.fn();
// The @/hooks barrel pulls Turnkey; these hooks only need these.
jest.mock('@/hooks', () => ({
  useContractGA: () => ({
    processTransactions: mockProcess,
    checkEnoughBalance: mockBalance,
    getDesiredTokenAmount: async () => ({
      dimo: BigInt(1),
      dcx: BigInt(1),
      licensePrice: 1,
      dimoCost: 1,
    }),
  }),
  useGlobalAccount: () => ({
    currentUser: { smartContractAddress: '0x1' },
    getCurrentDcxBalance: async () => 0,
    validateCurrentSession: async () => ({ walletAddress: '0x1' }),
  }),
}));
jest.mock('@/hooks/useSACD', () => ({ useSACD: jest.fn() }));
jest.mock('@/services/pricing', () => ({ getCurrentDimoPrice: jest.fn() }));
import {
  useMintLicense,
  usePayLicenseFee,
  useSetRedirectUri,
} from '@/hooks/useTransactions';
import { UserOperationFailedError } from '@/utils/userOperation';

const setUri = () =>
  renderHook(() => useSetRedirectUri(42)).result.current('https://app.test/', true);
const mint = () => renderHook(() => useMintLicense()).result.current('My license');
const pay = () => renderHook(() => usePayLicenseFee()).result.current();

// processTransactions resolves with success: false when a user operation lands
// and reverts without a reason. Reporting that as done tells a developer their
// redirect URI or license exists when the chain says it doesn't.
describe('license transactions', () => {
  beforeEach(() => {
    mockBalance.mockResolvedValue({ dcx: true, dimo: true, dlcAllowance: false });
  });

  it('resolve when the user operation succeeds', async () => {
    mockProcess.mockResolvedValue({ success: true, logs: [{ topics: ['0xabc'] }] });

    await expect(setUri()).resolves.toBeUndefined();
    await expect(mint()).resolves.toMatchObject({ logs: [{ topics: ['0xabc'] }] });
    await expect(pay()).resolves.toEqual({ success: true });
  });

  it.each([
    ['setting a redirect URI', setUri],
    ['minting a license', mint],
    ['paying the license fee', pay],
  ])('reject %s when it lands but reverts', async (_name, run) => {
    mockProcess.mockResolvedValue({ success: false, logs: [] });

    await expect(run()).rejects.toBeInstanceOf(UserOperationFailedError);
  });
});
