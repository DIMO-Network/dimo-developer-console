import { Suspense } from 'react';
import { Metadata } from 'next';

import { View } from '@/app/sign-up/components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Sign Up | ${configuration.appName}`,
  description:
    'Join DIMO Developer Console - Sign Up Today! Create your account to unlock powerful developer tools, and manage applications with ease. Get started and elevate your development experience now!',
};

const SignUp = () => {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
};

export default SignUp;
