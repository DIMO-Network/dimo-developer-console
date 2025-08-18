'use server';

import {
  AvailableSignal,
  Webhook,
  WebhookCreateInput,
  WebhookEditableFields,
} from '@/types/webhook';
import axios from 'axios';
import { extractAxiosMessage } from '@/utils/api';
import { captureException } from '@sentry/nextjs';
import { jwtDecode } from 'jwt-decode';

const getWebhooksApiClient = (token?: string) => {
  console.log('==========================================');
  console.log('🚀 WEBHOOK API CLIENT DEBUG');
  console.log('==========================================');
  console.log('Environment:', typeof window !== 'undefined' ? 'Browser' : 'Server');
  console.log(
    'Domain:',
    typeof window !== 'undefined' ? window.location.hostname : 'N/A',
  );
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Token provided to webhook client:', !!token);
  console.log('API Base URL:', process.env.NEXT_PUBLIC_EVENTS_API_URL);

  if (token) {
    console.log('🔍 TOKEN ANALYSIS:');
    console.log('Webhook JWT Preview:', token.substring(0, 30) + '...');
    console.log('Webhook JWT Length:', token.length);
    console.log('JWT starts with expected format:', token.startsWith('eyJ'));

    try {
      const decoded = jwtDecode(token);
      const now = Math.floor(Date.now() / 1000);
      console.log('📋 JWT CLAIMS:');
      console.log('- Issuer (iss):', decoded.iss);
      console.log('- Subject (sub):', decoded.sub);
      console.log('- Audience (aud):', decoded.aud);
      console.log(
        '- Expires (exp):',
        decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'No expiration',
      );
      console.log(
        '- Issued At (iat):',
        decoded.iat ? new Date(decoded.iat * 1000).toISOString() : 'No issued at',
      );
      console.log('- Current Time:', new Date().toISOString());
      console.log('- Token Expired:', decoded.exp ? now > decoded.exp : false);
      console.log(
        '- Time until expiry (minutes):',
        decoded.exp ? Math.round((decoded.exp - now) / 60) : 'N/A',
      );
    } catch (error) {
      console.error('❌ JWT DECODE ERROR:', error);
      console.log('This might indicate a malformed token!');
    }
  } else {
    console.log('❌ NO JWT PROVIDED');
    console.log('This will result in unauthenticated request');
  }

  let authHeader = undefined;
  if (token) {
    authHeader = `Bearer ${token}`;
    console.log('✅ Authorization header set');
  } else {
    console.log('❌ No Authorization header - API call will likely fail with 403');
  }

  console.log('==========================================');
  console.log('--- End Webhook API JWT Check ---');

  return axios.create({
    baseURL: process.env.NEXT_PUBLIC_EVENTS_API_URL,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': authHeader,
    },
  });
};

export const fetchAvailableSignals = async ({
  token,
}: {
  token: string;
}): Promise<AvailableSignal[]> => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.get<AvailableSignal[]>('/v1/webhooks/signals');
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error fetching available signals'));
  }
};

export const fetchWebhooks = async ({ token }: { token: string }): Promise<Webhook[]> => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.get<Webhook[]>('/v1/webhooks');
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error fetching webhooks'));
  }
};

export const fetchWebhookById = async ({
  webhookId,
  token,
}: {
  webhookId: string;
  token: string;
}): Promise<string[]> => {
  try {
    const client = getWebhooksApiClient(token);
    const response = await client.get<string[]>(`/v1/webhooks/${webhookId}`);
    return response.data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error fetching webhook'));
  }
};

export const createWebhook = async (
  webhook: WebhookCreateInput,
  token: string,
): Promise<Webhook> => {
  try {
    const client = getWebhooksApiClient(token);
    const response = await client.post<Webhook>('/v1/webhooks', webhook);
    return response.data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error creating webhook'));
  }
};

export const updateWebhook = async (
  id: string,
  webhook: WebhookEditableFields,
  token: string,
): Promise<Webhook> => {
  try {
    const { data } = await getWebhooksApiClient(token).put(`/v1/webhooks/${id}`, webhook);
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error updating webhook'));
  }
};

export const deleteWebhook = async ({
  webhookId,
  token,
}: {
  webhookId: string;
  token: string;
}): Promise<void> => {
  try {
    const client = getWebhooksApiClient(token);
    await client.delete(`/v1/webhooks/${webhookId}`);
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error deleting webhook'));
  }
};

export const subscribeAllVehicles = async (webhookId: string, token: string) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.post(`/v1/webhooks/${webhookId}/subscribe/all`);
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing all'));
  }
};

export const subscribeSingleVehicle = async ({
  webhookId,
  assetDID,
  token,
}: {
  webhookId: string;
  assetDID: string;
  token: string;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.post(`/v1/webhooks/${webhookId}/subscribe/${assetDID}`);
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing vehicle'));
  }
};

export const subscribeVehiclesList = async ({
  webhookId,
  assetDIDs,
  token,
}: {
  webhookId: string;
  assetDIDs: string[];
  token: string;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.post(`/v1/webhooks/${webhookId}/subscribe/list`, {
      assetDIDs,
    });
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing vehicles'));
  }
};

export const subscribeVehicles = async ({
  webhookId,
  assetDIDs,
  token,
}: {
  webhookId: string;
  assetDIDs: string[];
  token: string;
}) => {
  if (assetDIDs.length === 1) {
    return subscribeSingleVehicle({
      webhookId,
      assetDID: assetDIDs[0],
      token,
    });
  } else {
    return subscribeVehiclesList({
      webhookId,
      assetDIDs,
      token,
    });
  }
};

export const unsubscribeAllVehicles = async ({
  webhookId,
  token,
}: {
  webhookId: string;
  token: string;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.delete(`/v1/webhooks/${webhookId}/unsubscribe/all`);
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing vehicle'));
  }
};

export const unsubscribeSingleVehicle = async ({
  webhookId,
  assetDID,
  token,
}: {
  webhookId: string;
  assetDID: string;
  token: string;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.delete(
      `/v1/webhooks/${webhookId}/unsubscribe/${assetDID}`,
    );
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error unsubscribing vehicle'));
  }
};

export const unsubscribeVehiclesList = async ({
  webhookId,
  assetDIDs,
  token,
}: {
  webhookId: string;
  assetDIDs: string[];
  token: string;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.delete(`/v1/webhooks/${webhookId}/unsubscribe/list`, {
      data: { assetDIDs },
    });
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error unsubscribing vehicles'));
  }
};

// Smart unsubscription function that chooses the appropriate endpoint
export const unsubscribeVehicles = async ({
  webhookId,
  assetDIDs,
  token,
}: {
  webhookId: string;
  assetDIDs: string[];
  token: string;
}) => {
  if (assetDIDs.length === 1) {
    return unsubscribeSingleVehicle({
      webhookId,
      assetDID: assetDIDs[0],
      token,
    });
  } else {
    return unsubscribeVehiclesList({
      webhookId,
      assetDIDs,
      token,
    });
  }
};

// BARRETT TODO: Remove old CSV after testing
export const subscribeByCsv = async ({
  webhookId,
  token,
  formData,
}: {
  webhookId: string;
  token: string;
  formData: FormData;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.post(
      `/v1/webhooks/${webhookId}/subscribe/csv`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error subscribing by CSV'));
  }
};

// BARRETT TODO: Remove old CSV after testing
export const unsubscribeByCsv = async ({
  webhookId,
  token,
  formData,
}: {
  webhookId: string;
  token: string;
  formData: FormData;
}) => {
  try {
    const client = getWebhooksApiClient(token);
    const { data } = await client.delete(`/v1/webhooks/${webhookId}/unsubscribe/csv`, {
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  } catch (err) {
    captureException(err);
    throw new Error(extractAxiosMessage(err, 'Unknown error unsubscribing by CSV'));
  }
};
