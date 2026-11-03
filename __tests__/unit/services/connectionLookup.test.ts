const mockReadContract = jest.fn();
jest.mock('@/services/zerodev', () => ({
  getPublicClient: () => ({ readContract: mockReadContract }),
}));
import configuration from '@/config';
import { findMintedConnection } from '@/services/connectionLookup';

const owner = '0x1111111111111111111111111111111111111111';

const answers = (body: unknown, ok = true) =>
  (global.fetch as jest.Mock).mockResolvedValue({ ok, json: async () => body });

// identity-api's real answer for a name nobody has minted: an error, not an empty result.
const notFound = () =>
  answers({
    errors: [
      {
        message: 'No connection with name "Fleet".',
        path: ['connection'],
        extensions: { code: 'NOT_FOUND' },
      },
    ],
    data: { connection: null },
  });

const chainSays = (exists: boolean, holder = owner) =>
  mockReadContract.mockImplementation(async ({ functionName }) =>
    functionName === 'exists' ? exists : holder,
  );

describe('findMintedConnection', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    mockReadContract.mockReset();
  });

  describe('when Identity knows the name', () => {
    it('returns the owner and token id it holds, without reading the chain', async () => {
      answers({ data: { connection: { owner, tokenId: '7' } } });

      await expect(findMintedConnection('Fleet')).resolves.toEqual({
        owner,
        tokenId: '7',
      });

      const [, init] = (global.fetch as jest.Mock).mock.calls[0];
      expect(JSON.parse(init.body).variables).toEqual({ name: 'Fleet' });
      expect(mockReadContract).not.toHaveBeenCalled();
    });
  });

  // Identity indexes after the chain, so its NOT_FOUND can be a mint it hasn't seen.
  describe('when Identity says NOT_FOUND', () => {
    beforeEach(notFound);

    it('answers null only if the chain agrees', async () => {
      chainSays(false);

      await expect(findMintedConnection('Fleet')).resolves.toBeNull();
    });

    it('returns who holds the name on chain', async () => {
      chainSays(true);

      await expect(findMintedConnection('Vehicle Simulator')).resolves.toEqual({
        owner,
        tokenId:
          '39078077154588500488734674248814029619038553690572814363163890550005297053696',
      });
    });

    // Live connections, as Identity reports them. The contract's id is
    // uint256(bytes32(bytes(name))): 32 bytes needs no padding, and bytes are UTF-8.
    it.each([
      [
        'Vehicle Simulator',
        '39078077154588500488734674248814029619038553690572814363163890550005297053696',
      ],
      [
        'NowThatsWhatICallConnections2025',
        '35477345797128536019315529756701975408239834663262542247013618338718578389557',
      ],
    ])('asks the contract about the id it gave %s', async (name, tokenId) => {
      chainSays(true);

      await findMintedConnection(name);

      for (const functionName of ['exists', 'ownerOf']) {
        expect(mockReadContract).toHaveBeenCalledWith(
          expect.objectContaining({
            address: configuration.DCC_ADDRESS,
            functionName,
            args: [BigInt(tokenId)],
          }),
        );
      }
    });

    it('fails when the chain cannot be read', async () => {
      mockReadContract.mockRejectedValue(new Error('rpc down'));

      await expect(findMintedConnection('Fleet')).rejects.toThrow('rpc down');
    });

    it('fails when the holder cannot be read', async () => {
      mockReadContract.mockImplementation(async ({ functionName }) => {
        if (functionName === 'exists') return true;
        throw new Error('rpc down');
      });

      await expect(findMintedConnection('Fleet')).rejects.toThrow('rpc down');
    });
  });

  describe('when Identity cannot say', () => {
    it.each([
      ['any other GraphQL error', { errors: [{ message: 'db down' }], data: null }],
      [
        'a mix of errors',
        {
          errors: [
            { message: 'gone', extensions: { code: 'NOT_FOUND' } },
            { message: 'db down' },
          ],
          data: { connection: null },
        },
      ],
      ['an answer with no data', {}],
      ['a null connection with no error', { data: { connection: null } }],
      ['empty data', { data: {} }],
      [
        'NOT_FOUND beside a connection',
        {
          errors: [{ message: 'gone', extensions: { code: 'NOT_FOUND' } }],
          data: { connection: { owner, tokenId: '7' } },
        },
      ],
    ])('fails rather than answer "not minted" on %s', async (_label, body) => {
      answers(body);

      await expect(findMintedConnection('Fleet')).rejects.toThrow();
      expect(mockReadContract).not.toHaveBeenCalled();
    });

    it('fails when Identity answers an error status', async () => {
      answers({}, false);

      await expect(findMintedConnection('Fleet')).rejects.toThrow();
    });

    it('fails when Identity cannot be reached', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError('offline'));

      await expect(findMintedConnection('Fleet')).rejects.toThrow('offline');
    });
  });
});
