import React, { Suspense } from 'react';
import { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import configuration from '@/config';

import { PresetView } from './components/PresetView';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations('templates');
  return { title: t('metadata.newTitle', { appName: configuration.appName }) };
};

const NewTemplatePage = async () => {
  const t = await getTranslations('templates');
  return (
    <Suspense fallback={<div>{t('loading')}</div>}>
      <PresetView />
    </Suspense>
  );
};

export default NewTemplatePage;
