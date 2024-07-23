import { FC } from 'react';
import { Metadata } from 'next';

import configuration from '@/config';

import { View } from '@/app/app/View';

export const metadata: Metadata = {
  title: `Home | ${configuration.appName}`,
};

const HomePage: FC = () => <View />;

export default HomePage;
