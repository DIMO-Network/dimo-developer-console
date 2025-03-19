'use client';
import React from 'react';

import { withCredits, withNotifications, withGlobalAccounts, withApollo } from '@/hoc';

import './AuthorizedLayout.css';

const View = withNotifications(
  withGlobalAccounts(
    withApollo(
      withCredits(({ children }: { children: React.ReactNode }) => <>{children}</>),
    ),
  ),
);

export const AuthorizedLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => <View>{children}</View>;

export default AuthorizedLayout;
