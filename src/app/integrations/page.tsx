import { Suspense, type FC } from 'react';
import { Metadata } from 'next';

import { IntegrationsPage } from '@/components/Integrations';
import configuration from '@/config';

export const metadata: Metadata = {
    title: `Integrations | ${configuration.appName}`,
};

const Page: FC = () => {
    return (
        <Suspense>
            <IntegrationsPage />
        </Suspense>
    );
};

export default Page;
