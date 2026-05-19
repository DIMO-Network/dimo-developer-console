import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export interface BrandView {
  name: string | null;
  logoCid: string | null;
  iconCid: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  /** 7-char hex (#RRGGBB) or null. Drives SDK button + popup CTA color. */
  primaryColor: string | null;
  updatedAt: string | null;
}

export interface BrandPatch {
  name?: string | null;
  logoCid?: string | null;
  iconCid?: string | null;
  primaryColor?: string | null;
}

/**
 * Authenticated read of the current user's workspace brand. Returns an empty
 * object if no brand has been set yet (the API responds with `{}` rather than
 * 404 on the workspace-scoped read so the UI can render a blank edit form).
 */
export const getMyBrand = async (workspaceId: string): Promise<BrandView | null> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<BrandView | Record<string, never>>(
    `/api/my/workspace/${workspaceId}/brand`,
  );
  if (!data || typeof data !== 'object' || !('name' in data)) {
    return null;
  }
  return data as BrandView;
};

/**
 * Upsert the brand for a workspace. Partial — fields absent from `patch` are
 * left untouched server-side.
 */
export const updateMyBrand = async (
  workspaceId: string,
  patch: BrandPatch,
): Promise<BrandView> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.put<BrandView>(
    `/api/my/workspace/${workspaceId}/brand`,
    patch,
  );
  return data;
};

/**
 * Upload a single image to the DIMO IPFS gateway via the dev-console-api
 * proxy. Returns the CID to feed into a follow-up `updateMyBrand` call.
 */
export const uploadBrandAsset = async (
  workspaceId: string,
  file: File,
): Promise<{ cid: string; gatewayUrl: string }> => {
  const client = await dimoDevAPIClient();
  const form = new FormData();
  form.append('file', file);
  const { data } = await client.post<{ cid: string; gatewayUrl: string }>(
    `/api/my/workspace/${workspaceId}/brand/upload`,
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
};
