'use client';

import { RightPanel } from '@/components/RightPanel';
import React, { use, useEffect } from 'react';
import { FormStepTracker } from '@/app/webhooks/create/[clientId]/components/FormStepTracker';
import { NewWebhookForm } from '@/components/Webhooks/NewWebhookForm';
import { useRouter } from 'next/navigation';
import { getDevJwt } from '@/utils/devJwt';
import { FormStepContextProvider } from '@/hoc';
import { invalidateQuery } from '@/hooks/queries/useWebhooks';

export const View = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  const router = useRouter();
  const devJwt = getDevJwt(clientId);

  const getToken = () => {
    if (!devJwt) {
      throw new Error('No devJWT found');
    }
    return devJwt;
  };

  useEffect(() => {
    if (!devJwt) {
      router.replace('/webhooks');
    }
  }, [clientId, devJwt, router]);

  const onComplete = () => {
    invalidateQuery(clientId);
    router.replace('/webhooks');
  };

  return (
    <FormStepContextProvider>
      <div className={'flex flex-1 flex-row'}>
        <div className={'flex flex-col flex-1'}>
          <NewWebhookForm onComplete={onComplete} getToken={getToken} />
        </div>
        <RightPanel>
          <FormStepTracker />
        </RightPanel>
      </div>
    </FormStepContextProvider>
  );
};
