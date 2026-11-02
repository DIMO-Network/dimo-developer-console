import { AxiosError } from 'axios';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IWorkspace } from '@/types/workspace';

const isRefused = (error: unknown, ...statuses: number[]) =>
  error instanceof AxiosError && statuses.includes(error.response?.status ?? 0);

/**
 * Resolve the workspace by its on-chain license token id. Used by per-license
 * UIs (Brand panel) where the URL already pins the right workspace.
 * Returns null on 404 / 403: the license has no workspace this caller can see.
 */
export const getMyWorkspaceByTokenId = async (
  tokenId: number | string,
): Promise<IWorkspace | null> => {
  const client = await dimoDevAPIClient();
  try {
    const { data } = await client.get<IWorkspace>(
      `/api/my/workspace/by-token/${encodeURIComponent(String(tokenId))}`,
    );
    return data;
  } catch (error) {
    if (isRefused(error, 403, 404)) return null;
    throw error;
  }
};

export const createMyWorkspace = async (workspace: IWorkspace) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<IWorkspace>('/api/my/workspace', workspace);
  return data;
};

/**
 * The workspace of a license, created on first use: minting a license writes
 * nothing to console-api, so a new license has none yet. Returns null when the
 * caller isn't allowed to create it (only the license's team owner is).
 */
export const getOrCreateMyLicenseWorkspace = async (
  license: IWorkspace,
): Promise<IWorkspace | null> => {
  const existing = await getMyWorkspaceByTokenId(license.token_id);
  if (existing) return existing;
  try {
    return await createMyWorkspace(license);
  } catch (error) {
    if (isRefused(error, 403)) return null;
    throw error;
  }
};
