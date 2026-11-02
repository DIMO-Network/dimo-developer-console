'use server';
import {
  getMyWorkspaceByTokenId,
  getOrCreateMyLicenseWorkspace,
} from '@/services/workspace';
import { IWorkspace } from '@/types/workspace';

export const getWorkspaceByTokenId = async (tokenId: number | string) => {
  return getMyWorkspaceByTokenId(tokenId);
};

export const getOrCreateLicenseWorkspace = async (license: IWorkspace) => {
  return getOrCreateMyLicenseWorkspace(license);
};
