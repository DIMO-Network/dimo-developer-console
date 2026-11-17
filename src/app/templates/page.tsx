import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import configuration from '@/config';

import { TemplatesPage as View } from './templatesPage/View';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('templates');
  return { title: t('metadata.listTitle', { appName: configuration.appName }) };
};

const TemplatesPage = async () => {
  const t = await getTranslations('templates');
  return (
    <Suspense fallback={<div>{t('loading')}</div>}>
      <View />
    </Suspense>
  );
};

export default TemplatesPage;
