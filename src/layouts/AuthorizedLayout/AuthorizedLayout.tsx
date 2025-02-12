'use client';
import React from 'react';

import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import { withCredits, withNotifications, withRainBow, withGlobalAccounts } from '@/hoc';

import './AuthorizedLayout.css';

export const AuthorizedLayout = withRainBow(
  withNotifications(
    withCredits(
      withGlobalAccounts(
        ({
          children,
        }: Readonly<{
          children: React.ReactNode;
        }>) => (
          <div className="main">
            <Header />
            <div className="app-content">
              <Menu />
              <main className="page-content">{children}</main>
            </div>
          </div>
        ),
      ),
    ),
  ),
);

export default AuthorizedLayout;
