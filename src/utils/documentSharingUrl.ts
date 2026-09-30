import configuration from '@/config';

// The Login with DIMO link that asks an owner to share documents with a license.
// entryState ACCOUNT_MANAGER opens the account-level grant flow, not vehicle sharing.
export const documentSharingUrl = (input: { clientId: string; redirectUri: string }) => {
  const params = new URLSearchParams({
    clientId: input.clientId,
    redirectUri: input.redirectUri,
    entryState: 'ACCOUNT_MANAGER',
  });
  return `${configuration.loginBaseUrl}/?${params.toString()}`;
};
