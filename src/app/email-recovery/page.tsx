import { Suspense } from 'react';
import { Metadata } from 'next';

import { View } from '@/app/email-recovery/components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Email Recovery | ${configuration.appName}`,
  description:
    'Welcome to DIMO Developer Console Sign In. Access your developer dashboard securely to manage applications, and explore advanced the DIMO tools. Start coding and optimizing today!',
};

const EmailRecovery = () => {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
};

export default EmailRecovery;
