'use client';
import React from 'react';

import { withCredits, withNotifications } from '@/hoc';

import './AuthorizedLayout.css';
import withGlobalAccounts from '@/hoc/GlobalAccountProvider';

const View = withNotifications(
  withGlobalAccounts(
    withCredits(({ children }: { children: React.ReactNode }) => <>{children}</>),
  ),
);

export const AuthorizedLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => <View>{children}</View>;

export default AuthorizedLayout;
