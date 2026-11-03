'use server';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';
import { toFailure } from '@/utils/upstreamErrors';
import type { ApiResult } from '@/types/team';

export type ConnectionStatus = 'PENDING' | 'MINTED' | 'READY';

export interface Connection {
  id: string;
  name: string;
  company_id: string;
  connection_license_public_key: string;
  // Null when the API couldn't read them: a member's row, or keys_unreadable.
  connection_license_private_key: string | null;
  device_issuance_key: string | null;
  // Set on an owner's row whose stored keys can't be decrypted; absent reads as false.
  keys_unreadable?: boolean;
  // Older API versions send no status: those rows are finished.
  status?: ConnectionStatus;
  token_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateConnectionRequest {
  name: string;
  connection_license_public_key: string;
  connection_license_private_key: string;
  device_issuance_key: string;
  status?: ConnectionStatus;
  token_id?: string;
}

// An id can come from the URL (?resume=), so it must not be able to change the path.
const connectionPath = (id: string) => `/api/my/connections/${encodeURIComponent(id)}`;

// Returns the refusal rather than throwing: Next masks a thrown error in production,
// and the caller needs console-api's code. toFailure also strips the request, which
// carries these keys, before anything is reported.
export const createConnection = async (
  connectionData: CreateConnectionRequest,
): Promise<ApiResult<Connection>> => {
  try {
    const client = await dimoDevAPIClient();
    const { data } = await client.post<Connection>('/api/my/connections', connectionData);
    return { ok: true, data };
  } catch (error) {
    return toFailure(error);
  }
};

export const getMyConnections = async (): Promise<Connection[]> => {
  const client = await dimoDevAPIClient();
  const response = await client.get('/api/my/connections');

  return response.data.data || [];
};

// A deleted connection rejects with console-api's 404.
export const getConnectionById = async (id: string): Promise<Connection> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<Connection>(connectionPath(id));
  return data;
};

export const updateConnection = async (
  id: string,
  patch: { status: string; token_id?: string },
): Promise<void> => {
  const client = await dimoDevAPIClient();
  await client.put(connectionPath(id), patch);
};

export const deleteConnection = async (id: string): Promise<ApiResult<null>> => {
  try {
    const client = await dimoDevAPIClient();
    await client.delete(connectionPath(id));
    return { ok: true, data: null };
  } catch (error) {
    return toFailure(error);
  }
};
