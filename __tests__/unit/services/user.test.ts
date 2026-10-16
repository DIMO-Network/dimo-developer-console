/**
 * @jest-environment node
 */
const get = jest.fn();
jest.mock('@/services/dimoDevAPI', () => ({
  dimoDevAPIClient: jest.fn(async () => ({ get })),
  getCookie: jest.fn(async () => 'legacy-code'),
}));
import { getUserByToken } from '@/services/user';

describe('getUserByToken', () => {
  it('no longer forwards the legacy invitation_code cookie', async () => {
    get.mockResolvedValue({ data: { email: 'jane@harness.dev' } });
    await expect(getUserByToken()).resolves.toEqual({ email: 'jane@harness.dev' });
    expect(get).toHaveBeenCalledWith('/api/me');
  });
});
