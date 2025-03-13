'use client';
import React from 'react';

import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import { withCredits, withNotifications } from '@/hoc';

import './AuthorizedLayout.css';

export const AuthorizedLayout = withNotifications(
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
);

export default AuthorizedLayout;
