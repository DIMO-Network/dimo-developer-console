import { Suspense, type FC } from 'react';
import { Metadata } from 'next';

import { View } from './components/View';
import configuration from '@/config';

export const metadata: Metadata = {
  title: `Settings | ${configuration.appName}`,
};

const SettingsPage: FC = () => {
  return (
    <Suspense>
      <View />
    </Suspense>
  );
};

export default SettingsPage;
