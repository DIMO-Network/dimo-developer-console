import React, { Suspense, type FC } from 'react';
import { Metadata } from 'next';

import configuration from '@/config';

import { TemplatesPage as View } from './templatesPage/View';

export const metadata: Metadata = {
  title: `Templates | ${configuration.appName}`,
};

const TemplatesPage: FC = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <View />
  </Suspense>
);

export default TemplatesPage;
