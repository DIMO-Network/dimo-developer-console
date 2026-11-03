import { findConnectionByName } from '@/services/connectionLookup';

const answers = (body: unknown, ok = true) =>
  (global.fetch as jest.Mock).mockResolvedValue({ ok, json: async () => body });

const owner = '0x1111111111111111111111111111111111111111';

describe('findConnectionByName', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('returns the owner and token id Identity holds for the name', async () => {
    answers({ data: { connection: { owner, tokenId: '7' } } });

    await expect(findConnectionByName('Fleet')).resolves.toEqual({ owner, tokenId: '7' });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(init.body).variables).toEqual({ name: 'Fleet' });
  });

  // identity-api's real answer: an error, not an empty result.
  it('takes NOT_FOUND to mean nobody minted the name', async () => {
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

    await expect(findConnectionByName('Fleet')).resolves.toBeNull();
  });

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
  ])('fails rather than answer "not minted" on %s', async (_label, body) => {
    answers(body);

    await expect(findConnectionByName('Fleet')).rejects.toThrow();
  });

  it('fails when Identity answers an error status', async () => {
    answers({}, false);

    await expect(findConnectionByName('Fleet')).rejects.toThrow();
  });

  it('fails when Identity cannot be reached', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('offline'));

    await expect(findConnectionByName('Fleet')).rejects.toThrow('offline');
  });
});
