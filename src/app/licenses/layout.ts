import { Metadata } from 'next';
import configuration from '@/config';
import { AuthorizedLayout } from '@/layouts/AuthorizedLayout';

export const metadata: Metadata = {
  title: `Licenses | ${configuration.appName}`,
};

export default AuthorizedLayout;
