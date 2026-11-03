'use server';

import { AxiosError } from 'axios';
import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export type ConnectionStatus = 'PENDING' | 'MINTED' | 'READY';

export interface Connection {
  id: string;
  name: string;
  company_id: string;
  connection_license_public_key: string;
  connection_license_private_key: string;
  device_issuance_key: string;
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

export const createConnection = async (
  connectionData: CreateConnectionRequest,
): Promise<Connection> => {
  const client = await dimoDevAPIClient();
  try {
    const { data } = await client.post<Connection>('/api/my/connections', connectionData);
    return data;
  } catch (error) {
    // Next logs what an action throws, and an AxiosError carries the request body:
    // these keys. Only the status leaves here.
    const status = error instanceof AxiosError ? error.response?.status : undefined;
    throw new Error(`Saving the connection failed (${status ?? 'no response'})`);
  }
};

export const getMyConnections = async (): Promise<Connection[]> => {
  const client = await dimoDevAPIClient();
  const response = await client.get('/api/my/connections');

  return response.data.data || [];
};

// A deleted connection answers 200 with null.
export const getConnectionById = async (id: string): Promise<Connection | null> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<Connection | null>(connectionPath(id));
  return data;
};

export const updateConnection = async (
  id: string,
  patch: { status: string; token_id?: string },
): Promise<void> => {
  const client = await dimoDevAPIClient();
  await client.put(connectionPath(id), patch);
};

export const deleteConnection = async (id: string): Promise<void> => {
  const client = await dimoDevAPIClient();
  await client.delete(connectionPath(id));
};
