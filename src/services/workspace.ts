import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { IWorkspace } from '@/types/workspace';

export const getMyWorkspace = async () => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<IWorkspace>('/api/my/workspace');
  return data;
};

/**
 * Resolve the workspace by its on-chain license token id. Used by per-license
 * UIs (Brand panel) where the URL already pins the right workspace — avoids
 * the company-scoped lookup that misses when workspace.company_id is stale.
 * Returns null on 404 / 403 so callers can fall back cleanly.
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
  } catch {
    return null;
  }
};

export const createMyWorkspace = async (workspace: IWorkspace) => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<IWorkspace>('/api/my/workspace', workspace);
  return data;
};
