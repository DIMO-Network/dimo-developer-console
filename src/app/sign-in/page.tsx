import { Suspense } from 'react';
import { Metadata } from 'next';

import { View } from '@/app/sign-in/components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Sign In | ${configuration.appName}`,
  description:
    'Welcome to DIMO Developer Console Sign In. Access your developer dashboard securely to manage applications, and explore advanced the DIMO tools. Start coding and optimizing today!',
};

const SignIn = () => {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
};

export default SignIn;
