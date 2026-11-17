'use client';

import React, { Suspense, FC } from 'react';
import { useTranslations } from 'next-intl';

import { WebhooksPage as View } from './webhooksPage/View';

const WebhooksPage: FC = () => {
  const t = useTranslations('common');
  return (
    <Suspense fallback={<div>{t('status.loading')}</div>}>
      <View />
    </Suspense>
  );
};

export default WebhooksPage;
