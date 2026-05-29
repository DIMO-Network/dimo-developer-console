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
): Promise<BrandView> => createBrandService(workspaceId, patch);

export const updateMyBrandById = async (
  workspaceId: string,
  brandId: string,
  patch: BrandPatch,
): Promise<BrandView> => updateBrandByIdService(workspaceId, brandId, patch);

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
): Promise<{ cid: string; gatewayUrl: string }> => uploadBrandAsset(workspaceId, file);
