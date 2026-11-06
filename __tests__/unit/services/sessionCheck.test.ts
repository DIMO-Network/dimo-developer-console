/**
 * @jest-environment node
 */
jest.mock('@/services/user', () => ({ getUserByToken: jest.fn() }));
jest.mock('@/services/globalAccount', () => ({ getUserSubOrganization: jest.fn() }));
import { getUserByToken } from '@/services/user';
import { getUserSubOrganization } from '@/services/globalAccount';
import { ACCOUNT_LOOKUP_TIMEOUT_MS, checkSession } from '@/services/sessionCheck';

const compliantUser = {
  email: 'dev@dimo.test',
  name: 'Dev',
  team: { id: 't1' },
  role: 'OWNER',
};
const subOrganization = { subOrganizationId: 'sub-1', hasPasskey: true };

describe('checkSession', () => {
  let now = 0;
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    (getUserByToken as jest.Mock).mockImplementation(async () => {
      now += 2_500; // console-api took 2.5 s
      return compliantUser;
    });
    (getUserSubOrganization as jest.Mock).mockResolvedValue(subOrganization);
  });
  afterEach(() => jest.restoreAllMocks());

  it('gives both lookups one deadline: the second gets what the first left', async () => {
    now = 10_000;
    await expect(checkSession('jwt', 3_000)).resolves.toEqual({ status: 'ok' });
    expect(getUserByToken).toHaveBeenCalledWith('jwt', 3_000);
    expect(getUserSubOrganization).toHaveBeenCalledWith('dev@dimo.test', {
      timeout: 500,
    });
  });

  it('sends nothing more once the deadline has passed', async () => {
    now = 10_000;
    await expect(checkSession('jwt', 2_000)).rejects.toThrow('ran out of time');
    expect(getUserSubOrganization).not.toHaveBeenCalled();
  });

  it("keeps the proxy's own timeouts without a budget", async () => {
    await checkSession();
    expect(getUserByToken).toHaveBeenCalledWith(undefined, undefined);
    expect(getUserSubOrganization).toHaveBeenCalledWith('dev@dimo.test', {
      timeout: ACCOUNT_LOOKUP_TIMEOUT_MS,
    });
  });

  it('reports an account without a global account, and one still onboarding', async () => {
    (getUserSubOrganization as jest.Mock).mockResolvedValueOnce(null);
    await expect(checkSession()).resolves.toEqual({ status: 'no-account' });
    (getUserByToken as jest.Mock).mockResolvedValueOnce({ ...compliantUser, team: null });
    await expect(checkSession()).resolves.toMatchObject({ status: 'unfinished' });
  });
});
