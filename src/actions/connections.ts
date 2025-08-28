/* eslint-disable @typescript-eslint/no-explicit-any */
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
  console.log('🔵 createConnection called with data:', {
    name: connectionData.name,
    hasPublicKey: !!connectionData.connection_license_public_key,
    hasPrivateKey: !!connectionData.connection_license_private_key,
    hasDeviceKey: !!connectionData.device_issuance_key,
  });

  try {
    const client = await dimoDevAPIClient();
    console.log('🔵 API client created, making POST request to /api/my/connections');

    const { data } = await client.post<Connection>('/api/my/connections', connectionData);
    console.log('✅ createConnection successful, received connection ID:', data.id);
    return data;
  } catch (error: unknown) {
    console.error('❌ createConnection failed:', error);
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('❌ Response status:', axiosError.response?.status);
      console.error('❌ Response data:', axiosError.response?.data);
    }
    throw error;
  }
};

export const getMyConnections = async (): Promise<Connection[]> => {
  console.log('🔵 getMyConnections server action called');

  // Add more detailed environment logging
  console.log('🔵 Server environment check:', {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    hasBackendUrl: !!process.env.BACKEND_URL,
  });

  try {
    const client = await dimoDevAPIClient();
    console.log('🔵 API client created successfully');
    console.log('🔵 Making GET request to /api/my/connections');

    const response = await client.get('/api/my/connections');
    console.log('✅ getMyConnections response status:', response.status);
    console.log('✅ getMyConnections response data structure:', {
      hasData: !!response.data,
      hasDataProperty: !!response.data?.data,
      dataType: typeof response.data,
      dataKeys: response.data ? Object.keys(response.data) : [],
      connectionCount: response.data?.data ? response.data.data.length : 0,
    });

    const connections = response.data.data || [];
    console.log('✅ Returning', connections.length, 'connections');
    return connections;
  } catch (error: unknown) {
    console.error('❌ getMyConnections server action failed:', error);

    // More detailed error logging
    if (error && typeof error === 'object') {
      if ('response' in error) {
        const axiosError = error as any;
        console.error('❌ Axios response error:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          headers: axiosError.response?.headers,
        });
      } else if ('request' in error) {
        const axiosError = error as any;
        console.error('❌ Axios request error (no response):', axiosError.request);
      } else if ('message' in error) {
        console.error('❌ General error:', (error as Error).message);
        console.error('❌ Error stack:', (error as Error).stack);
      }
    }

    // Re-throw with more context
    throw new Error(
      `Failed to fetch connections: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

export const getConnectionById = async (id: string): Promise<Connection> => {
  console.log('🔵 getConnectionById called with ID:', id);

  try {
    const client = await dimoDevAPIClient();
    console.log('🔵 API client created, making GET request to /api/my/connections/' + id);

    const { data } = await client.get<Connection>(`/api/my/connections/${id}`);
    console.log('✅ getConnectionById successful, received connection:', data.name);
    return data;
  } catch (error: unknown) {
    console.error('❌ getConnectionById failed for ID:', id, error);
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as any;
      console.error('❌ Response status:', axiosError.response?.status);
      console.error('❌ Response data:', axiosError.response?.data);
    }
    throw error;
  }
};
