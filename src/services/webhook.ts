'use server';
import { Webhook, Condition } from '@/types/webhook';
import xior from 'xior';
import config from '@/config';
import { IApp, ISigner } from '@/types/app';
import { testApp } from '@/actions/app';
import { getAppByID } from '@/actions/app';


async function fetchAppDetails(appId: string): Promise<IApp> {
    const app = await getAppByID(appId);
    if (!app) {
        throw new Error(`App with ID ${appId} not found.`);
    }
    if (app.deleted) {
        throw new Error(`App with ID ${appId} has been deleted.`);
    }
    if (!app.Signers || app.Signers.length === 0) {
        throw new Error(`No signers available for app with ID ${appId}.`);
    }
    return app;
}


function selectSigner(app: IApp): ISigner {
    const signer = app.Signers?.find((signer) => signer.id && signer.api_key);
    if (!signer) {
        throw new Error(`No valid signer found for app with ID ${app.id}.`);
    }
    return signer;
}



const createWebhookApiClient = async (appId: string) => {
    // Fetch the app details, including Signers and RedirectUris.
    const app = await fetchAppDetails(appId);

    // Select the first available signer.
    const signer = selectSigner(app);

    // Use testApp to get the access token.
    const tokens = await testApp(app, signer);
    console.log('Tokens:', tokens);

    const accessToken = tokens.access_token;
    if (!accessToken) {
        throw new Error('Access token is missing in testApp response.');
    }

    // Create and return the API client.
    return xior.create({
        baseURL: config.API_BASE_URL,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
        },
    });
};

export const fetchSignalNames = async (appId: string): Promise<string[]> => {
    const client = await createWebhookApiClient(appId);
    const { data } = await client.get<string[]>('/webhooks/signals');
    return data;
};

export const fetchWebhooks = async (appId: string): Promise<Webhook[]> => {
    const client = await createWebhookApiClient(appId);
    const { data } = await client.get<Webhook[]>('/webhooks');
    return data;
};

export const createWebhook = async (appId: string, webhook: Partial<Webhook>): Promise<Webhook> => {
    const client = await createWebhookApiClient(appId);
    const payload = {
        service: webhook.service,
        trigger: webhook.trigger,
        setup: webhook.setup,
        target_uri: webhook.target_uri,
        parameters: webhook.parameters,
        developer_license_address: webhook.developer_license_address,
        status: webhook.status,
        description: webhook.description,
    };
    const { data } = await client.post<Webhook>('/webhooks', payload);
    return data;
};

export const updateWebhook = async (
    appId: string,
    id: string,
    webhook: Partial<Webhook>
): Promise<Webhook> => {
    const client = await createWebhookApiClient(appId);
    const payload = {
        service: webhook.service,
        data: webhook.data,
        trigger: webhook.trigger,
        setup: webhook.setup,
        target_uri: webhook.target_uri,
        parameters: webhook.parameters,
        status: webhook.status,
        description: webhook.description,
    };
    const { data } = await client.put<Webhook>(`/webhooks/${id}`, payload);
    return data;
};

export const deleteWebhook = async (appId: string, id: string): Promise<void> => {
    const client = await createWebhookApiClient(appId);
    await client.delete(`/webhooks/${id}`);
};

export const generateCEL = async (
    appId: string,
    conditions: Condition[],
    logic: string
): Promise<string> => {
    const client = await createWebhookApiClient(appId);
    const { data } = await client.post<{ cel_expression: string }>('/build-cel', {
        conditions,
        logic,
    });
    return data.cel_expression;
};
