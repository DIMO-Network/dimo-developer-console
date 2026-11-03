import React, { Suspense, type FC } from 'react';
import { Metadata } from 'next';

import configuration from '@/config';

import { PresetView } from './components/PresetView';

export const metadata: Metadata = {
  title: `New template | ${configuration.appName}`,
};

const NewTemplatePage: FC = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <PresetView />
  </Suspense>
);

export default NewTemplatePage;
