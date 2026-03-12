'use server';

import { dimoDevAPIClient } from '@/services/dimoDevAPI';

export interface Connection {
  id: string;
  name: string;
  company_id: string;
  connection_license_public_key: string;
  connection_license_private_key: string;
  device_issuance_key: string;
  created_at: string;
  updated_at: string;
}

export interface CreateConnectionRequest {
  name: string;
  connection_license_public_key: string;
  connection_license_private_key: string;
  device_issuance_key: string;
}

export const createConnection = async (
  connectionData: CreateConnectionRequest,
): Promise<Connection> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.post<Connection>('/api/my/connections', connectionData);
  return data;
};

export const getMyConnections = async (): Promise<Connection[]> => {
  const client = await dimoDevAPIClient();
  const response = await client.get('/api/my/connections');

  return response.data.data || [];
};

export const getConnectionById = async (id: string): Promise<Connection> => {
  const client = await dimoDevAPIClient();
  const { data } = await client.get<Connection>(`/api/my/connections/${id}`);
  return data;
};
