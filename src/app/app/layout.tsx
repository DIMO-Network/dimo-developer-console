'use client';
import React from 'react';

import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import { UserContext } from '@/context/userContext';
import { useUser } from '@/hooks';

import './layout.css';

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user, setUser } = useUser();
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <div className="main">
        <Header />
        <div className="app-content">
          <Menu />
          <main className="page-content">{children}</main>
        </div>
      </div>
    </UserContext.Provider>
  );
}
