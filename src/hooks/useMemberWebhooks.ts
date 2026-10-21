'use client';
import { useQuery } from '@tanstack/react-query';
import { useDimoAuth } from '@/hooks/useDimoAuth';
import { fetchWebhooks } from '@/services/webhook';
import type { Webhook } from '@/types/webhook';
import { getDevJwt } from '@/utils/devJwt';

export class NeedsDevJwtError extends Error {
  constructor() {
    super('A developer JWT is needed to read this license’s webhooks');
    this.name = 'NeedsDevJwtError';
  }
}

export const touchedBy = (webhook: Webhook, addresses: string[]) => {
  const wanted = new Set(addresses.map((a) => a.toLowerCase()));
  return {
    created:
      !!webhook.createdBySigner && wanted.has(webhook.createdBySigner.toLowerCase()),
    updated:
      !!webhook.updatedBySigner && wanted.has(webhook.updatedBySigner.toLowerCase()),
  };
};

// Webhooks on one license that a member created or last changed (C3), read
// with the owner's developer JWT: the one in this browser, else a new one from
// the owner's wallet, else one the owner pastes.
export const useMemberWebhooks = ({
  clientId,
  redirectUri,
  addresses,
  pastedJwt,
}: {
  clientId: string;
  redirectUri: string | null;
  addresses: string[];
  pastedJwt?: string;
}) => {
  const { getGlobalAccountDeveloperJwt } = useDimoAuth();
  return useQuery({
    queryKey: [
      'member-webhooks',
      clientId,
      redirectUri,
      addresses.join(','),
      pastedJwt ?? '',
    ],
    retry: false,
    queryFn: async () => {
      let token = pastedJwt || getDevJwt(clientId);
      if (!token && redirectUri) {
        const generated = await getGlobalAccountDeveloperJwt({
          clientId: clientId as `0x${string}`,
          domain: redirectUri,
        }).catch(() => false);
        if (generated) token = getDevJwt(clientId);
      }
      if (!token) throw new NeedsDevJwtError();
      const webhooks = await fetchWebhooks({ token });
      return webhooks
        .map((webhook) => ({ webhook, ...touchedBy(webhook, addresses) }))
        .filter(({ created, updated }) => created || updated);
    },
  });
};
