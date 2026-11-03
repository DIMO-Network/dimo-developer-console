'use server';
import { getOrCreateMyLicenseWorkspace } from '@/services/workspace';
import { IWorkspace } from '@/types/workspace';

export const getOrCreateLicenseWorkspace = async (license: IWorkspace) => {
  return getOrCreateMyLicenseWorkspace(license);
};
