'use client';
import { type FC, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { MemberDevJwtError, useMemberDevJwt } from '@/hooks/useMemberDevJwt';
import { useMixPanel } from '@/hooks/useMixPanel';

export const ConnectWalletButton: FC<{
  clientId: string;
  domain: string;
  onSuccess: () => void;
  label?: string;
}> = ({ clientId, domain, onSuccess, label = 'Connect with your wallet' }) => {
  const getMemberDevJwt = useMemberDevJwt();
  const { trackEvent } = useMixPanel();
  const [busy, setBusy] = useState(false);

  const connect = async () => {
    setBusy(true);
    try {
      await getMemberDevJwt({ clientId, domain });
      trackEvent('Wallet Connected', { clientId });
      onSuccess();
    } catch (error) {
      Sentry.captureException(error);
      toast.error(
        error instanceof MemberDevJwtError
          ? error.message
          : "Couldn't connect your wallet. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button onClick={connect} loading={busy}>
      {label}
    </Button>
  );
};
