/**
 * @jest-environment node
 */
import { AxiosError } from 'axios';

jest.mock('@/services/teams', () => ({ fetchLicenseSigners: jest.fn() }));
jest.mock('@/services/workspace', () => ({ getMyWorkspaceByTokenId: jest.fn() }));
jest.mock('@/services/brand', () => ({ listMyBrands: jest.fn() }));

import { GET as getSigners } from '@/app/api/licenses/[tokenId]/signers/route';
import { GET as getBrands } from '@/app/api/licenses/[tokenId]/brands/route';
import { fetchLicenseSigners } from '@/services/teams';
import { getMyWorkspaceByTokenId } from '@/services/workspace';
import { listMyBrands } from '@/services/brand';

const request = new Request('http://localhost/api/licenses/1254');
const ctx = (tokenId: string) => ({ params: Promise.resolve({ tokenId }) });

afterEach(() => jest.clearAllMocks());

describe('license read routes', () => {
  it('signers: returns the registry', async () => {
    const body = { ok: true, data: { signers: [] } };
    (fetchLicenseSigners as jest.Mock).mockResolvedValue(body);
    const res = await getSigners(request, ctx('1254'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(body);
    expect(fetchLicenseSigners).toHaveBeenCalledWith(1254);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('signers: refuses a token id that is not a number', async () => {
    const res = await getSigners(request, ctx('abc'));
    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe('BAD_TOKEN_ID');
    expect(fetchLicenseSigners).not.toHaveBeenCalled();
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('signers: passes NOT_A_MEMBER through', async () => {
    (fetchLicenseSigners as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      code: 'NOT_A_MEMBER',
      message: 'gone',
    });
    const res = await getSigners(request, ctx('1254'));
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('NOT_A_MEMBER');
  });

  it('brands: returns the workspace and its brands', async () => {
    const workspace = { id: 'ws-1', name: 'Fleet' };
    (getMyWorkspaceByTokenId as jest.Mock).mockResolvedValue(workspace);
    (listMyBrands as jest.Mock).mockResolvedValue([{ id: 'b1' }]);
    const res = await getBrands(request, ctx('1254'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ workspace, brands: [{ id: 'b1' }] });
    expect(listMyBrands).toHaveBeenCalledWith('ws-1');
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('brands: refuses a token id that is not a number', async () => {
    const res = await getBrands(request, ctx('12x'));
    expect(res.status).toBe(400);
    expect(getMyWorkspaceByTokenId).not.toHaveBeenCalled();
  });

  it('brands: a license without a visible workspace has no brands', async () => {
    (getMyWorkspaceByTokenId as jest.Mock).mockResolvedValue(null);
    const res = await getBrands(request, ctx('1254'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ workspace: null, brands: [] });
    expect(listMyBrands).not.toHaveBeenCalled();
  });

  it('brands: answers 502 when console-api was not reached', async () => {
    (getMyWorkspaceByTokenId as jest.Mock).mockRejectedValue(
      new AxiosError('Network Error'),
    );
    const res = await getBrands(request, ctx('1254'));
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain('Network Error');
  });
});
