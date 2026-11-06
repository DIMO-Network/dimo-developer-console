'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as Sentry from '@sentry/nextjs';
import { useDimoAuth } from '@/hooks/useDimoAuth';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import type { LocalDeveloperLicense } from '@/types/webhook';

// 'checking': looking up the owner's console key. 'minting': making the JWT.
// 'off': console access isn't on for this license, so an API key it is.
// 'failed': it was on, and making the JWT didn't work.
export type ConsoleAccessJwtState = 'checking' | 'minting' | 'off' | 'failed';

/**
 * With console access on (the owner's wallet key enabled as one of the
 * license's API keys), the console makes the owner's developer JWT itself:
 * the license page does it as it opens. A page that needs one (vehicles,
 * webhooks) does it too, instead of asking for an API key or sending the
 * owner to the license page first. Once per license; `onMinted` when stored.
 */
export const useConsoleAccessJwt = (
  license: LocalDeveloperLicense,
  onMinted: () => void,
): ConsoleAccessJwtState => {
  const { currentUser } = useGlobalAccount();
  const { findConsoleKeyAddress, getGlobalAccountDeveloperJwt } = useDimoAuth();
  // The license page's query (same key): a read-only Turnkey lookup.
  const consoleKey = useQuery({
    queryKey: ['console-key', currentUser?.subOrganizationId],
    queryFn: findConsoleKeyAddress,
    enabled: !!currentUser,
    retry: false,
  });
  const on = license.hasSigner(consoleKey.data);
  const [failed, setFailed] = useState<string | null>(null);
  const tried = useRef<string | null>(null);

  useEffect(() => {
    if (!on || tried.current === license.clientId) return;
    tried.current = license.clientId;
    const clientId = license.clientId;
    getGlobalAccountDeveloperJwt({
      clientId: clientId as `0x${string}`,
      domain: license.firstRedirectURI,
    })
      .then((minted) => (minted ? onMinted() : setFailed(clientId)))
      .catch((error: unknown) => {
        Sentry.captureException(error);
        setFailed(clientId);
      });
    // Once per license: onMinted and the auth helpers change every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, license.clientId]);

  if (!currentUser || consoleKey.isLoading) return 'checking';
  if (!on) return 'off';
  return failed === license.clientId ? 'failed' : 'minting';
};
