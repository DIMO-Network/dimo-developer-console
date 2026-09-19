'use client';

import React, { Suspense, type FC } from 'react';

import { TemplatesPage as View } from './templatesPage/View';

const TemplatesPage: FC = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <View />
  </Suspense>
);

export default TemplatesPage;
