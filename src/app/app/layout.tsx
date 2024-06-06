import React from 'react';

import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';

import './layout.css';
import RainbowSessionProvider from '@/hoc/RainbowSessionProvider';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
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
}
