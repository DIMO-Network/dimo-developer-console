import { renderHook } from '@testing-library/react';
import { type Abi, decodeFunctionData, keccak256, toBytes, toHex } from 'viem';
import DimoConnectionABI from '@/contracts/DimoConnectionABI.json';
import SacdABI from '@/contracts/Sacd.json';
import { UserOperationFailedError } from '@/utils/userOperation';

const mockProcess = jest.fn();
const mockDimoBalance = jest.fn();
const mockSign = jest.fn();
// The @/hooks barrel pulls Turnkey; this hook only needs these.
jest.mock('@/hooks/useContractGA', () => ({
  useContractGA: () => ({ processTransactions: mockProcess }),
}));
jest.mock('@/hooks/useGlobalAccount', () => ({
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

const hook = () => renderHook(() => useMintConnection()).result.current;
const mint = () => hook().mint('My connection');
const grant = (onStep?: (step: string) => void) =>
  hook().grant({
    connectionId: CONNECTION_ID,
    licenseGrantee: LICENSE_GRANTEE,
    deviceIssuanceGrantee: ISSUANCE_GRANTEE,
    onStep,
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

describe('useMintConnection mint', () => {
  beforeEach(() => {
    jest.mocked(getCurrentDimoPrice).mockResolvedValue(0.0169);
    mockDimoBalance.mockResolvedValue(100);
    mockProcess.mockResolvedValue({ success: true, logs: [MINTED_LOG] });
  });

  it('answers with the id and grants nothing', async () => {
    await expect(mint()).resolves.toEqual({
      success: true,
      connectionId: CONNECTION_ID,
    });

    expect(mockProcess).toHaveBeenCalledTimes(1);
    expect(mockSign).not.toHaveBeenCalled();
  });

  it('mints to the smart account', async () => {
    await mint();

    const [[, mintCall]] = mockProcess.mock.calls[0];
    const { args } = decodeFunctionData({
      abi: DimoConnectionABI as Abi,
      data: mintCall.data,
    });
    expect(args).toEqual([WALLET, 'My connection']);
  });

  // A revert with no reason resolves with success: false rather than throwing, and
  // must not read as a mint.
  it('throws on a user operation that reverted', async () => {
    mockProcess.mockResolvedValue({ success: false });

    await expect(mint()).rejects.toBeInstanceOf(UserOperationFailedError);
  });

  it('translates a refusal', async () => {
    mockProcess.mockRejectedValue(new Error('NameAlreadyInUse("My connection")'));

    await expect(mint()).resolves.toEqual({
      success: false,
      nameInUse: true,
      reason: expect.stringContaining('already taken'),
    });
  });

  it('marks only a name collision as one', async () => {
    mockProcess.mockRejectedValue(new Error('ERC20: transfer amount exceeds balance'));

    await expect(mint()).resolves.toEqual({
      success: false,
      reason: expect.stringContaining('$DIMO'),
    });
  });

  it('passes on what it cannot explain', async () => {
    mockProcess.mockRejectedValue(new Error('bundler timed out'));

    await expect(mint()).rejects.toThrow('bundler timed out');
  });
});

describe('useMintConnection grant', () => {
  beforeEach(() => {
    mockProcess.mockResolvedValue({ success: true, logs: [] });
    mockSign.mockResolvedValue('ipfs://sacd');
  });

  it('gives each key its permission on the connection', async () => {
    const steps: string[] = [];

    await grant((step) => steps.push(step));

    expect(steps).toEqual(['signing-agreements', 'granting-permissions']);
    expect(mockSign.mock.calls.map(([{ grantee }]) => grantee).sort()).toEqual(
      [ISSUANCE_GRANTEE, LICENSE_GRANTEE].sort(),
    );
    expect(mockProcess).toHaveBeenCalledTimes(1);
    const [calls] = mockProcess.mock.calls[0];
    const granted = calls.map(({ data }: { data: `0x${string}` }) =>
      decodeFunctionData({ abi: SacdABI as Abi, data }).args?.slice(1, 3),
    );
    expect(granted).toEqual([
      [CONNECTION_ID, ISSUANCE_GRANTEE],
      [CONNECTION_ID, LICENSE_GRANTEE],
    ]);
  });

  it('spends nothing: no balance check, no mint', async () => {
    await grant();

    expect(mockDimoBalance).not.toHaveBeenCalled();
    expect(getCurrentDimoPrice).not.toHaveBeenCalled();
  });

  it('throws on a user operation that reverted', async () => {
    mockProcess.mockResolvedValue({ success: false });

    await expect(grant()).rejects.toBeInstanceOf(UserOperationFailedError);
  });
});
