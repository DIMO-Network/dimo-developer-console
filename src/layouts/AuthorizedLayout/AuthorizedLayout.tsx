'use client';
import React from 'react';

import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import RainbowSessionProvider from '@/hoc/RainbowSessionProvider';

import './AuthorizedLayout.css';

export const AuthorizedLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <RainbowSessionProvider>
    <div className="main">
      <Header />
      <div className="app-content">
        <Menu />
        <main className="page-content">{children}</main>
      </div>
    </div>
  </RainbowSessionProvider>
);

export default AuthorizedLayout;
