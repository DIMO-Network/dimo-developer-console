import { fetchApiResult } from '@/utils/fetchApiResult';

const answer = (status: number, body: unknown) =>
  (global.fetch as jest.Mock).mockResolvedValue({
    status,
    json: () => (body instanceof Error ? Promise.reject(body) : Promise.resolve(body)),
  });

describe('fetchApiResult', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('returns the ApiResult body of a 200', async () => {
    const body = { ok: true, data: { teams: [] } };
    answer(200, body);
    await expect(fetchApiResult('/api/teams')).resolves.toEqual(body);
  });

  it('returns a refusal body with its code', async () => {
    const body = { ok: false, status: 403, code: 'NOT_A_MEMBER', message: 'x' };
    answer(403, body);
    await expect(fetchApiResult('/api/team/members')).resolves.toEqual(body);
  });

  it('turns a non-ApiResult answer into a failure with its status', async () => {
    answer(401, { message: 'Unauthorized' });
    await expect(fetchApiResult('/api/teams')).resolves.toMatchObject({
      ok: false,
      status: 401,
      code: null,
    });
  });

  it('turns a body that is not JSON into a failure', async () => {
    answer(500, new SyntaxError('Unexpected token <'));
    await expect(fetchApiResult('/api/teams')).resolves.toMatchObject({
      ok: false,
      status: 500,
      code: null,
    });
  });

  it('turns a network failure into status 0', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(fetchApiResult('/api/teams')).resolves.toEqual({
      ok: false,
      status: 0,
      code: null,
      message: 'Failed to fetch',
    });
  });
});
