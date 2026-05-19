'use server';
import {
  getMyBrand,
  updateMyBrand,
  uploadBrandAsset,
  type BrandPatch,
  type BrandView,
} from '@/services/brand';

export const fetchMyBrand = async (workspaceId: string): Promise<BrandView | null> => {
  return getMyBrand(workspaceId);
};

export const saveMyBrand = async (
  workspaceId: string,
  patch: BrandPatch,
): Promise<BrandView> => {
  return updateMyBrand(workspaceId, patch);
};

export const uploadMyBrandAsset = async (
  workspaceId: string,
  file: File,
): Promise<{ cid: string; gatewayUrl: string }> => {
  return uploadBrandAsset(workspaceId, file);
};
