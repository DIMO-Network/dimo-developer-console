import { Turnkey } from '@turnkey/sdk-server';
export const turnkeyConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
  apiPrivateKey: process.env.NEXT_PUBLIC_TURNKEY_API_PRIVATE_KEY!,
  apiPublicKey: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
  defaultOrganizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!,
  rpId: process.env.NEXT_PUBLIC_RPID!,
};

const turnkeyClient = new Turnkey({
  apiBaseUrl: turnkeyConfig.apiBaseUrl,
  apiPrivateKey: turnkeyConfig.apiPrivateKey,
  apiPublicKey: turnkeyConfig.apiPublicKey,
  defaultOrganizationId: turnkeyConfig.defaultOrganizationId,
});
export const turnkeyApiClient = turnkeyClient.apiClient();