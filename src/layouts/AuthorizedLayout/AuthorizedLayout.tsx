'use client';
import React from 'react';

import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import { withCredits, withNotifications, withRainBow } from '@/hoc';

import './AuthorizedLayout.css';
import withTurnKey from '@/hoc/TurnkeySessionProvider';

export const AuthorizedLayout = withRainBow(
  withNotifications(
    withTurnKey(
      withCredits(
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
