'use server';
import {
  getMyBrand,
  updateMyBrand,
  listMyBrands,
  createMyBrand as createBrandService,
  updateMyBrandById as updateBrandByIdService,
  deleteMyBrandById,
  setDefaultMyBrand as setDefaultService,
  uploadBrandAsset,
  type BrandPatch,
  type BrandView,
} from '@/services/brand';
import { toFailure } from '@/services/teams';
import type { ApiResult } from '@/types/team';

// What a Server Action throws reaches the browser masked, without its status. A
// refusal the form has to explain comes back as a value instead.
const settled = async <T>(run: () => Promise<T>): Promise<ApiResult<T>> => {
  try {
    return { ok: true, data: await run() };
  } catch (error) {
    return toFailure(error);
  }
};

// ── compat shims (kept for existing callers) ──────────────────────────────

export const fetchMyBrand = async (workspaceId: string): Promise<BrandView | null> =>
  getMyBrand(workspaceId);

export const saveMyBrand = async (
  workspaceId: string,
  patch: BrandPatch,
): Promise<BrandView> => updateMyBrand(workspaceId, patch);

// ── multi-brand collection ────────────────────────────────────────────────

export const fetchMyBrands = async (workspaceId: string): Promise<BrandView[]> =>
  listMyBrands(workspaceId);

export const createMyBrand = async (
  workspaceId: string,
  patch: BrandPatch,
): Promise<ApiResult<BrandView>> => settled(() => createBrandService(workspaceId, patch));

export const updateMyBrandById = async (
  workspaceId: string,
  brandId: string,
  patch: BrandPatch,
): Promise<ApiResult<BrandView>> =>
  settled(() => updateBrandByIdService(workspaceId, brandId, patch));

export const deleteMyBrand = async (
  workspaceId: string,
  brandId: string,
): Promise<void> => deleteMyBrandById(workspaceId, brandId);

export const setDefaultBrand = async (
  workspaceId: string,
  brandId: string,
): Promise<BrandView> => setDefaultService(workspaceId, brandId);

export const uploadMyBrandAsset = async (
  workspaceId: string,
  file: File,
): Promise<ApiResult<{ cid: string; gatewayUrl: string }>> =>
  settled(() => uploadBrandAsset(workspaceId, file));
