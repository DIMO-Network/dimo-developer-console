import { renderHook } from '@testing-library/react';
import { decodeFunctionData, keccak256, toBytes, toHex, type Abi } from 'viem';
import configuration from '@/config';
import SacdABI from '@/contracts/Sacd.json';
import { ALL_VEHICLE_PERMISSIONS } from '@/utils/sacdPermissions';

const mockProcess = jest.fn();
const mockSign = jest.fn();
// The @/hooks barrel pulls Turnkey; this hook only needs these.
jest.mock('@/hooks/useContractGA', () => ({
  useContractGA: () => ({ processTransactions: mockProcess }),
}));
jest.mock('@/hooks/useGlobalAccount', () => ({
  useGlobalAccount: () => ({ currentUser: { smartContractAddress: WALLET } }),
}));
jest.mock('@/hooks/useSACD', () => ({
  useSACD: () => ({ signAndUploadPermissionSACD: mockSign }),
}));
import { useMintVehicle } from '@/hooks/useMintVehicle';

const WALLET = '0x1111111111111111111111111111111111111111';
const SIMULATOR = '0x2222222222222222222222222222222222222222';
const LICENSE = '0x3333333333333333333333333333333333333333';
const TOKEN_ID = 42;
const MINTED_LOG = {
  topics: [
    keccak256(
      toBytes('VehicleNodeMintedWithDeviceDefinition(uint256,uint256,address,string)'),
    ),
    '0x',
    toHex(TOKEN_ID, { size: 32 }),
  ],
};

const mint = (sacdGrantees: `0x${string}`[]) =>
  renderHook(() => useMintVehicle()).result.current({
    manufacturerNodeId: 131,
    deviceDefinitionId: 'toyota_rav4_2022',
    make: 'Toyota',
    model: 'RAV4',
    year: 2022,
    powertrainType: 'ICE',
    sacdGrantees,
  });

const grantedTo = (calls: Array<{ to: string; data: `0x${string}` }>) =>
  calls.map(({ data }) => {
    const { functionName, args } = decodeFunctionData({
      abi: SacdABI as Abi,
      data,
    });
    const [asset, tokenId, grantee, permissions, , source] = args as [
      string,
      bigint,
      string,
      bigint,
      bigint,
      string,
    ];
    return { functionName, asset, tokenId, grantee, permissions, source };
  });

describe('useMintVehicle SACD grants', () => {
  beforeEach(() => {
    // clearMocks keeps queued once-values; start each test from a clean queue.
    mockProcess.mockReset();
    mockSign.mockReset();
    mockProcess.mockResolvedValue({ success: true, logs: [MINTED_LOG] });
    mockSign.mockImplementation(async ({ grantee }) => `ipfs://${grantee}`);
  });

  it('grants every grantee in one operation', async () => {
    await expect(mint([SIMULATOR, LICENSE])).resolves.toMatchObject({
      success: true,
      tokenId: TOKEN_ID,
      sacdFailed: false,
    });

    expect(mockSign).toHaveBeenCalledTimes(2);
    expect(mockSign).toHaveBeenCalledWith(
      expect.objectContaining({ grantee: SIMULATOR, grantor: WALLET }),
    );
    expect(mockSign).toHaveBeenCalledWith(
      expect.objectContaining({ grantee: LICENSE, grantor: WALLET }),
    );

    // The mint, then one operation carrying both grants.
    expect(mockProcess).toHaveBeenCalledTimes(2);
    const grantCalls = mockProcess.mock.calls[1][0];
    expect(grantCalls).toHaveLength(2);
    grantCalls.forEach(({ to }: { to: string }) =>
      expect(to).toBe(configuration.DIMO_SACD_ADDRESS),
    );
    expect(grantedTo(grantCalls)).toEqual([
      expect.objectContaining({
        functionName: 'setPermissions',
        asset: configuration.VEHICLE_NFT_ADDRESS,
        tokenId: BigInt(TOKEN_ID),
        grantee: SIMULATOR,
        permissions: ALL_VEHICLE_PERMISSIONS,
        source: `ipfs://${SIMULATOR}`,
      }),
      expect.objectContaining({
        functionName: 'setPermissions',
        grantee: LICENSE,
        permissions: ALL_VEHICLE_PERMISSIONS,
        source: `ipfs://${LICENSE}`,
      }),
    ]);
  });

  it('signs one grant when the license owns the simulator address', async () => {
    const checksummed = '0x299671D2b32ED62Cc61ce65D8f2b9e4f78486B37';

    await expect(
      mint([checksummed, checksummed.toLowerCase() as `0x${string}`]),
    ).resolves.toMatchObject({ tokenId: TOKEN_ID, sacdFailed: false });

    expect(mockSign).toHaveBeenCalledTimes(1);
    expect(mockSign).toHaveBeenCalledWith(
      expect.objectContaining({ grantee: checksummed }),
    );
    expect(mockProcess.mock.calls[1][0]).toHaveLength(1);
  });

  it('reports a failed grant without losing the vehicle', async () => {
    mockSign.mockRejectedValue(new Error('IPFS down'));
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await mint([SIMULATOR, LICENSE]);
    logged.mockRestore();

    expect(result).toMatchObject({ success: true, tokenId: TOKEN_ID, sacdFailed: true });
    // Only the mint went on chain.
    expect(mockProcess).toHaveBeenCalledTimes(1);
  });

  it('rejects a reverted grant', async () => {
    mockProcess
      .mockResolvedValueOnce({ success: true, logs: [MINTED_LOG] })
      .mockResolvedValueOnce({ success: false, reason: 'reverted', logs: [] });
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await mint([SIMULATOR, LICENSE]);
    logged.mockRestore();

    expect(result).toMatchObject({ tokenId: TOKEN_ID, sacdFailed: true });
  });

  it('keeps the vehicle when the grant transaction throws', async () => {
    mockProcess
      .mockResolvedValueOnce({ success: true, logs: [MINTED_LOG] })
      .mockRejectedValueOnce(new Error('bundler down'));
    const logged = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await mint([SIMULATOR, LICENSE]);
    logged.mockRestore();

    expect(result).toMatchObject({ tokenId: TOKEN_ID, sacdFailed: true });
  });

  it('does not grant when the minted token id could not be read', async () => {
    mockProcess.mockResolvedValue({ success: true, logs: [] });
    const warned = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    const result = await mint([SIMULATOR, LICENSE]);
    warned.mockRestore();

    expect(result).toMatchObject({ tokenId: null, sacdFailed: false });
    expect(mockSign).not.toHaveBeenCalled();
    expect(mockProcess).toHaveBeenCalledTimes(1);
  });
});
