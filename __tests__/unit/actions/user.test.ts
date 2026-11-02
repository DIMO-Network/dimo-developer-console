jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('jose', () => ({ createRemoteJWKSet: jest.fn(), jwtVerify: jest.fn() }));
jest.mock('@/services/user', () => ({
  existUserByEmailOrAddress: jest.fn(),
  getUserByToken: jest.fn(),
}));
jest.mock('@/services/globalAccount', () => ({ getUserSubOrganization: jest.fn() }));
import { getUser, getUserInformation } from '@/actions/user';
import { getUserSubOrganization } from '@/services/globalAccount';
import { existUserByEmailOrAddress, getUserByToken } from '@/services/user';

const onConsole = { existItem: true, role: 'owner', currentWallet: '0x1' };

describe('getUserInformation', () => {
  // Older than global accounts. Destructuring the missing organization threw, so
  // sign-in could only ever answer "Something went wrong".
  it('says a console account has no global account', async () => {
    (existUserByEmailOrAddress as jest.Mock).mockResolvedValue(onConsole);
    (getUserSubOrganization as jest.Mock).mockResolvedValue(null);

    await expect(getUserInformation('dev@x.test')).resolves.toMatchObject({
      existsOnGlobalAccount: false,
      existsOnDevConsole: true,
    });
  });

  it('answers null for someone unknown to both', async () => {
    (existUserByEmailOrAddress as jest.Mock).mockResolvedValue({ existItem: false });
    (getUserSubOrganization as jest.Mock).mockResolvedValue(null);

    await expect(getUserInformation('new@x.test')).resolves.toBeNull();
  });

  it('returns the account when both exist', async () => {
    (existUserByEmailOrAddress as jest.Mock).mockResolvedValue(onConsole);
    (getUserSubOrganization as jest.Mock).mockResolvedValue({
      hasPasskey: true,
      subOrganizationId: 'org-1',
    });

    await expect(getUserInformation('dev@x.test')).resolves.toMatchObject({
      existsOnDevConsole: true,
      subOrganizationId: 'org-1',
    });
  });
});

describe('getUser', () => {
  it('answers null when the lookup fails', async () => {
    (getUserByToken as jest.Mock).mockRejectedValue(new Error('401'));

    await expect(getUser()).resolves.toBeNull();
  });
});
