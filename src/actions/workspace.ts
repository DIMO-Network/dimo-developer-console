'use server';
import { getMyWorkspace, createMyWorkspace } from '@/services/workspace';
import { IWorkspace } from '@/types/workspace';

export const getWorkspace = async () => {
  return getMyWorkspace();
};

export const createWorkspace = async (workspace: IWorkspace) => {
  return createMyWorkspace(workspace);
};
