import { FC } from 'react';
import { Metadata } from 'next';

import configuration from '@/config';

import { SwitchPage } from '@/app/app/components/SwitchPage';

export const metadata: Metadata = {
  title: `Home | ${configuration.appName}`,
};

export const HomePage: FC = SwitchPage;

export default HomePage;
