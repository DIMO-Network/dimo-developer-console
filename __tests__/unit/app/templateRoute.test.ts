/**
 * @jest-environment node
 */
import { GET, PUT } from '@/app/api/templates/[id]/route';
import { NextRequest } from 'next/server';

jest.mock('@/services/definitions');
jest.mock('@/services/templateEntitlement', () => ({
  ...jest.requireActual('@/services/templateEntitlement'),
  resolveCaller: jest.fn(),
  countMintedVehicles: jest.fn().mockResolvedValue(0),
  manufacturerOwner: jest.fn().mockResolvedValue(null),
  curatorAddresses: jest.fn().mockReturnValue([]),
}));

import { fetchTemplate, fetchVocabulary, publishTemplate } from '@/services/definitions';
import {
  resolveCaller,
  countMintedVehicles,
  curatorAddresses,
} from '@/services/templateEntitlement';

const CALLER = '0x1111111111111111111111111111111111111111';
const params = { params: Promise.resolve({ id: 'toyota_camry_2020' }) };

const body = (over: Record<string, unknown> = {}) => ({
  id: 'toyota_camry_2020',
  deviceType: 'vehicle',
  manufacturer: { slug: 'toyota', name: 'Toyota' },
  model: 'Camry',
  year: 2020,
  attributes: {},
  trims: [{ name: 'LE', attributes: {} }],
  ...over,
});

const put = (payload: unknown, headers: Record<string, string> = {}) =>
  new NextRequest('https://console.test/api/templates/toyota_camry_2020', {
    method: 'PUT',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(payload),
  });

const stored = { ...body(), version: 3, author: CALLER, createdAt: 'x', updatedAt: 'y' };

describe('PUT /api/templates/[id]', () => {
  beforeEach(() => {
    (resolveCaller as jest.Mock).mockResolvedValue({ address: CALLER, email: 'a@b.c' });
    (fetchTemplate as jest.Mock).mockResolvedValue(stored);
    (publishTemplate as jest.Mock).mockResolvedValue({
      ok: true,
      template: { ...stored, version: 4 },
    });
    (countMintedVehicles as jest.Mock).mockResolvedValue(0);
    (curatorAddresses as jest.Mock).mockReturnValue([]);
  });

  it('401s when there is no session', async () => {
    (resolveCaller as jest.Mock).mockResolvedValue(null);
    expect((await PUT(put(body()), params)).status).toBe(401);
  });

  it('stamps author from the session and never from the body', async () => {
    await PUT(put(body(), { 'if-match': '"3"' }), params);
    expect((publishTemplate as jest.Mock).mock.calls[0][1].author).toBe(CALLER);
  });

  it('rejects a body that tries to name its own author or version, rather than stripping it quietly', async () => {
    for (const field of ['author', 'version', 'createdAt', 'updatedAt']) {
      const resp = await PUT(
        put(body({ [field]: field === 'version' ? 9 : 'x' })),
        params,
      );
      expect(resp.status).toBe(400);
      expect((await resp.json()).error).toContain(field);
    }
  });

  it('requires If-Match when the template already exists', async () => {
    const resp = await PUT(put(body()), params);
    expect(resp.status).toBe(428);
  });

  it('forwards the client If-Match rather than the version it just read', async () => {
    // The freshly-read version would silently rebase a stale editor onto
    // whatever landed while it was open. The client's own version is the only
    // one that means "this is what I edited".
    await PUT(put(body(), { 'if-match': '"2"' }), params);
    expect((publishTemplate as jest.Mock).mock.calls[0][2]).toEqual({
      kind: 'update',
      version: 2,
    });
  });

  it('sends If-None-Match on a create', async () => {
    (fetchTemplate as jest.Mock).mockResolvedValue(null);
    await PUT(put(body()), params);
    expect((publishTemplate as jest.Mock).mock.calls[0][2]).toEqual({ kind: 'create' });
  });

  it('403s a caller who needs a proposal, and names the count', async () => {
    (countMintedVehicles as jest.Mock).mockResolvedValue(4212);
    const resp = await PUT(put(body(), { 'if-match': '"3"' }), params);
    expect(resp.status).toBe(403);
    expect((await resp.json()).entitlement).toMatchObject({
      kind: 'proposal-required',
      mintedVehicles: 4212,
    });
    expect(publishTemplate).not.toHaveBeenCalled();
  });

  it('403s a hardwareTemplateId change from a non-curator, at every tier', async () => {
    const resp = await PUT(
      put(body({ hardwareTemplateId: '999' }), { 'if-match': '"3"' }),
      params,
    );
    expect(resp.status).toBe(403);
    expect((await resp.json()).error).toContain('hardwareTemplateId');
    expect(publishTemplate).not.toHaveBeenCalled();
  });

  it('lets a curator set hardwareTemplateId', async () => {
    (curatorAddresses as jest.Mock).mockReturnValue([CALLER.toLowerCase()]);
    const resp = await PUT(
      put(body({ hardwareTemplateId: '999' }), { 'if-match': '"3"' }),
      params,
    );
    expect(resp.status).toBe(200);
  });

  describe('per-trim hardwareTemplateId', () => {
    // The worker's TRIM_KEYS carry hardwareTemplateId too, so a body whose
    // top-level value is untouched can still change what hardware a trim ships.
    const trim = (name: string, hardwareTemplateId?: string) => ({
      name,
      ...(hardwareTemplateId ? { hardwareTemplateId } : {}),
      attributes: {},
    });
    const storedWithTrimHw = { ...stored, trims: [trim('LE', '130')] };

    it('403s a non-curator who changes a trim hardwareTemplateId under an unchanged top-level one', async () => {
      (fetchTemplate as jest.Mock).mockResolvedValue(storedWithTrimHw);
      const resp = await PUT(
        put(body({ trims: [trim('LE', '999')] }), { 'if-match': '"3"' }),
        params,
      );
      expect(resp.status).toBe(403);
      expect((await resp.json()).error).toContain('hardwareTemplateId');
      expect(publishTemplate).not.toHaveBeenCalled();
    });

    it('lets a non-curator resubmit a trim hardwareTemplateId unchanged', async () => {
      (fetchTemplate as jest.Mock).mockResolvedValue(storedWithTrimHw);
      const resp = await PUT(
        put(body({ trims: [trim('LE', '130')] }), { 'if-match': '"3"' }),
        params,
      );
      expect(resp.status).toBe(200);
    });

    it('lets a curator change a trim hardwareTemplateId', async () => {
      (curatorAddresses as jest.Mock).mockReturnValue([CALLER.toLowerCase()]);
      (fetchTemplate as jest.Mock).mockResolvedValue(storedWithTrimHw);
      const resp = await PUT(
        put(body({ trims: [trim('LE', '999')] }), { 'if-match': '"3"' }),
        params,
      );
      expect(resp.status).toBe(200);
    });

    it('403s a non-curator who adds a trim carrying a hardwareTemplateId', async () => {
      const resp = await PUT(
        put(body({ trims: [trim('LE'), trim('XLE', '999')] }), { 'if-match': '"3"' }),
        params,
      );
      expect(resp.status).toBe(403);
      expect(publishTemplate).not.toHaveBeenCalled();
    });

    it('lets a non-curator add a trim without one', async () => {
      const resp = await PUT(
        put(body({ trims: [trim('LE'), trim('XLE')] }), { 'if-match': '"3"' }),
        params,
      );
      expect(resp.status).toBe(200);
    });

    it('403s a non-curator who drops a trim hardwareTemplateId the stored template has', async () => {
      (fetchTemplate as jest.Mock).mockResolvedValue(storedWithTrimHw);
      const resp = await PUT(
        put(body({ trims: [trim('LE')] }), { 'if-match': '"3"' }),
        params,
      );
      expect(resp.status).toBe(403);
      expect(publishTemplate).not.toHaveBeenCalled();
    });

    it('403s a non-curator creating a template whose trim carries a hardwareTemplateId', async () => {
      // There is no stored template to compare against on a create, so any
      // per-trim value from a non-curator is a change.
      (fetchTemplate as jest.Mock).mockResolvedValue(null);
      const resp = await PUT(put(body({ trims: [trim('LE', '130')] })), params);
      expect(resp.status).toBe(403);
      expect(publishTemplate).not.toHaveBeenCalled();
    });
  });

  it('passes the worker validation errors through unchanged', async () => {
    (publishTemplate as jest.Mock).mockResolvedValue({
      ok: false,
      kind: 'validation',
      errors: ['template: unknown attribute "nope"'],
    });
    const resp = await PUT(put(body(), { 'if-match': '"3"' }), params);
    expect(resp.status).toBe(422);
    expect((await resp.json()).errors).toEqual(['template: unknown attribute "nope"']);
  });

  it('turns a worker 412 into a 409 carrying the version to rebase onto', async () => {
    (publishTemplate as jest.Mock).mockResolvedValue({
      ok: false,
      kind: 'conflict',
      expected: 3,
      actual: 5,
    });
    const resp = await PUT(put(body(), { 'if-match': '"3"' }), params);
    expect(resp.status).toBe(409);
    expect(await resp.json()).toMatchObject({ conflict: { expected: 3, actual: 5 } });
  });
});

describe('GET /api/templates/[id]', () => {
  it('returns the template, the live vocabulary and the caller entitlement in one payload', async () => {
    (resolveCaller as jest.Mock).mockResolvedValue({ address: CALLER, email: 'a@b.c' });
    (fetchTemplate as jest.Mock).mockResolvedValue(stored);
    (fetchVocabulary as jest.Mock).mockResolvedValue({
      id: 'vehicle',
      name: 'Vehicle',
      attributes: [],
    });
    const json = await (
      await GET(
        new NextRequest('https://console.test/api/templates/toyota_camry_2020'),
        params,
      )
    ).json();
    expect(json.template.version).toBe(3);
    expect(json.vocabulary.id).toBe('vehicle');
    expect(json.entitlement.kind).toBe('author');
  });
});
