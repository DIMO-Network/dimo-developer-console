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

  console.log('==========================================');
  console.log('🏗️ WEBHOOK CREATE VIEW DEBUG');
  console.log('==========================================');
  console.log('Client ID from params:', clientId);
  console.log(
    'Current URL:',
    typeof window !== 'undefined' ? window.location.href : 'N/A',
  );
  console.log('Environment:', process.env.NODE_ENV);
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV);

  const devJwt = getDevJwt(clientId);

  console.log('🎯 POST-RETRIEVAL CHECK:');
  console.log('devJWT retrieved successfully:', !!devJwt);
  if (!devJwt) {
    console.log('❌ NO DEV JWT - User will be redirected back');
  }
  console.log('==========================================');

  const getToken = () => {
    console.log('🔄 getToken() called - Real-time JWT check');
    const currentJwt = getDevJwt(clientId);
    if (!currentJwt) {
      console.error('❌ CRITICAL: No devJWT found when getToken() called');
      throw new Error('No devJWT found');
    }
    console.log('✅ JWT retrieved successfully in getToken()');
    return currentJwt;
  };

  const goBack = () => {
    console.log('↩️ Redirecting back to webhooks list');
    router.replace('/webhooks');
  };

  useEffect(() => {
    console.log('🔍 useEffect - JWT validation check');
    console.log('clientId:', clientId);
    console.log('devJwt exists:', !!devJwt);

    if (!devJwt) {
      console.log('❌ No JWT found in useEffect - redirecting');
      goBack();
    } else {
      console.log('✅ JWT validation passed in useEffect');
    }
  }, [clientId, devJwt]);

  const onComplete = () => {
    console.log('🎉 Webhook creation completed successfully');
    invalidateQuery(clientId);
    goBack();
  };

  return (
    <FormStepContextProvider>
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
