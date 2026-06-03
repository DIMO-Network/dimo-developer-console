'use client';

import { RightPanel } from '@/components/RightPanel';
import React, { use, useEffect } from 'react';
import { FormStepTracker } from '@/app/webhooks/create/[clientId]/components/FormStepTracker';
import { NewWebhookForm } from '@/components/Webhooks/NewWebhookForm';
import { useRouter } from 'next/navigation';
import { getDevJwt } from '@/utils/devJwt';
import { FormStepContextProvider } from '@/hoc';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';
import Link from 'next/link';

export const View = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  const router = useRouter();
  const devJwt = getDevJwt(clientId);

  const getToken = () => {
    const currentJwt = getDevJwt(clientId);
    if (!currentJwt) {
      throw new Error('No devJWT found');
    }
    return currentJwt;
  };

  const goBack = () => {
    router.replace('/webhooks');
  };

  useEffect(() => {
    if (!devJwt) {
      goBack();
    }
  }, [clientId, devJwt]);

  const onComplete = () => {
    invalidateQuery(clientId);
    goBack();
  };

  return (
    <FormStepContextProvider>
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
        <Link href="/webhooks" className="hover:text-foreground transition-colors">
          Webhooks
        </Link>
        <span>/</span>
        <span className="text-foreground">New Webhook</span>
      </nav>
      <div className={'flex flex-1 flex-row'}>
        <div className={'flex flex-col flex-1'}>
          <NewWebhookForm onComplete={onComplete} getToken={getToken} onExit={goBack} />
        </div>
        <RightPanel>
          <FormStepTracker />
        </RightPanel>
      </div>
    </FormStepContextProvider>
  );
};
