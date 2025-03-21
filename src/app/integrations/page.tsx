'use client';

import React, { Suspense, FC } from 'react';
import { WebhooksPage } from '@/components/Webhooks/WebhooksPage';

const WebhooksPage: FC = () => {

    return (
        <Suspense fallback={<div>Loading...</div>}>
            <WebhooksPage />
        </Suspense>
    );
};

export default WebhooksPage;
