import { FC } from 'react';
import { Metadata } from 'next';

import configuration from '@/config';

import { View } from '@/app/app/components/View';

export const metadata: Metadata = {
  title: `Home | ${configuration.appName}`,
};

export const HomePage: FC = () => <View />;

export default HomePage;
