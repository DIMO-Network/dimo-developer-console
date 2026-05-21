'use server';
import {
  getMyWorkspace,
  getMyWorkspaceByTokenId,
  createMyWorkspace,
} from '@/services/workspace';
import { IWorkspace } from '@/types/workspace';

export const getWorkspace = async () => {
  return getMyWorkspace();
};

export const getWorkspaceByTokenId = async (tokenId: number | string) => {
  return getMyWorkspaceByTokenId(tokenId);
};

export const createWorkspace = async (workspace: IWorkspace) => {
  return createMyWorkspace(workspace);
};
