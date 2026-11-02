import { renderHook } from '@testing-library/react';
import { keccak256, toBytes, toHex } from 'viem';

const mockProcess = jest.fn();
const mockDimoBalance = jest.fn();
const mockSign = jest.fn();
// The @/hooks barrel pulls Turnkey; this hook only needs these.
jest.mock('@/hooks', () => ({
  useContractGA: () => ({ processTransactions: mockProcess }),
  useGlobalAccount: () => ({
    currentUser: { smartContractAddress: WALLET },
    getCurrentDimoBalance: mockDimoBalance,
    validateCurrentSession: async () => ({ walletAddress: '0x1' }),
  }),
}));
jest.mock('@/hooks/useSACD', () => ({
  useSACD: () => ({ signAndUploadPermissionSACD: mockSign }),
}));
jest.mock('@/services/pricing', () => ({ getCurrentDimoPrice: jest.fn() }));
import { useMintConnection } from '@/hooks/useTransactions';
import { getCurrentDimoPrice } from '@/services/pricing';

const WALLET = '0x1111111111111111111111111111111111111111';
const LICENSE_GRANTEE = '0x2222222222222222222222222222222222222222';
const ISSUANCE_GRANTEE = '0x3333333333333333333333333333333333333333';
const CONNECTION_ID = BigInt(7);
const MINTED_LOG = {
  topics: [
    keccak256(
      toBytes('ConnectionMinted(address,uint256,address,string,bytes32,uint256)'),
    ),
    '0x',
    toHex(CONNECTION_ID, { size: 32 }),
  ],
};

const mint = () =>
  renderHook(() => useMintConnection()).result.current({
    connectionName: 'My connection',
    licenseGrantee: LICENSE_GRANTEE,
    deviceIssuanceGrantee: ISSUANCE_GRANTEE,
  });

// $1 / $0.0169 per DIMO, plus the 5% buffer: 62.13 DIMO.
describe('useMintConnection DIMO balance check', () => {
  beforeEach(() => {
    jest.mocked(getCurrentDimoPrice).mockResolvedValue(0.0169);
    mockProcess.mockResolvedValue({ success: true, logs: [MINTED_LOG] });
    mockSign.mockResolvedValue('ipfs://sacd');
  });

  it('refuses a wallet short of DIMO before any transaction', async () => {
    mockDimoBalance.mockResolvedValue(0);

    await expect(mint()).resolves.toEqual({
      success: false,
      reason: expect.stringContaining('62.1'),
    });
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('continues with enough DIMO', async () => {
    mockDimoBalance.mockResolvedValue(100);

    await expect(mint()).resolves.toMatchObject({
      success: true,
      connectionId: CONNECTION_ID,
    });
    expect(mockProcess).toHaveBeenCalled();
  });

  it("does not blame the wallet when the balance can't be read", async () => {
    mockDimoBalance.mockRejectedValue(new Error('rpc down'));
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await mint();
    logged.mockRestore();

    expect(result).toEqual({
      success: false,
      reason: expect.stringContaining("Couldn't check your DIMO balance"),
    });
    expect(result).not.toEqual({
      success: false,
      reason: expect.stringContaining('Insufficient'),
    });
    expect(mockProcess).not.toHaveBeenCalled();
  });
});
