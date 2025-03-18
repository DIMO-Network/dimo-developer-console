'use client';
import React, {useState} from 'react';

import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
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
