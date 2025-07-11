'use client';

import React, { Suspense, FC } from 'react';

import { WebhooksPage as View } from './webhooksPage/View';

const WebhooksPage: FC = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <View />
    </Suspense>
  );
};

export default WebhooksPage;
