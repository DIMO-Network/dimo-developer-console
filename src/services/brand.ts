import { isAxiosError } from 'axios';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export interface BrandView {
  id: string;
  name: string | null;
  logoCid: string | null;
  iconCid: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  /** 7-char hex (#RRGGBB) or null. Drives SDK button + popup CTA color. */
  primaryColor: string | null;
  isDefault: boolean;
  updatedAt: string | null;
}

export interface BrandPatch {
  name?: string | null;
  logoCid?: string | null;
  iconCid?: string | null;
  primaryColor?: string | null;
}

/**
 * Authenticated read of the current user's workspace brand.
 * Returns null when no brand has been set yet (API returns 404).
 */
export const getMyBrand = async (workspaceId: string): Promise<BrandView | null> => {
  const client = await dimoDevAPIClient();
  try {
    const { data } = await client.get<BrandView>(
      `/api/my/workspace/${workspaceId}/brand`,
    );
    return data;
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) return null;
    throw err;
  }
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

export const listMyBrands = async (workspaceId: string): Promise<BrandView[]> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<BrandView[]>(
    `/api/my/workspace/${workspaceId}/brands`,
  );
  return data;
};

export const createMyBrand = async (
  workspaceId: string,
  patch: BrandPatch,
): Promise<BrandView> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<BrandView>(
    `/api/my/workspace/${workspaceId}/brands`,
    patch,
  );
  return data;
};

export const updateMyBrandById = async (
  workspaceId: string,
  brandId: string,
  patch: BrandPatch,
): Promise<BrandView> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.put<BrandView>(
    `/api/my/workspace/${workspaceId}/brands/${brandId}`,
    patch,
  );
  return data;
};

export const deleteMyBrandById = async (
  workspaceId: string,
  brandId: string,
): Promise<void> => {
  const client = await dimoDevAPIClient();
  await client.delete(`/api/my/workspace/${workspaceId}/brands/${brandId}`);
};

export const setDefaultMyBrand = async (
  workspaceId: string,
  brandId: string,
): Promise<BrandView> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<BrandView>(
    `/api/my/workspace/${workspaceId}/brands/${brandId}/default`,
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
  // 60 s — IPFS pinning can take well over the default 5 s
  const client = await dimoDevAPIClient(60_000);
  const form = new FormData();
  form.append('file', file);
  // Do NOT set Content-Type manually: Axios must auto-add the multipart boundary
  const { data } = await client.post<{ cid: string; gatewayUrl: string }>(
    `/api/my/workspace/${workspaceId}/brand/upload`,
    form,
  );
  return data;
};
