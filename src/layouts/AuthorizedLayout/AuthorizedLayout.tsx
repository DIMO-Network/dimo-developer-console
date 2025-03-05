'use client';
import React from 'react';

import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import {
  withCredits,
  withNotifications,
  withNextSession,
  withGlobalAccounts,
} from '@/hoc';

import './AuthorizedLayout.css';

export const AuthorizedLayout = withNextSession(
  withNotifications(
    withGlobalAccounts(
      withCredits(
         ({
          children,
        }: Readonly<{
          children: React.ReactNode;
        }>) => {
          return (
            <div className="main">
              <div className="flex">
                <Menu />
              </div>
              <div className="app-content">
                <Header />
                <main className="page-content">{children}</main>
              </div>
            </div>
          );
        },
      ),
    ),
  ),
);

export default AuthorizedLayout;
