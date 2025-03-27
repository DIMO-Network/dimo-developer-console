'use client';
import React, { useState } from 'react';
import { MenuButton } from '@/components/Menu/MenuButton';
import {
  withCredits,
  withNotifications,
  withGlobalAccounts,
  withApollo,
  withAccountInformation,
} from '@/hoc';
import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import './AuthorizedLayout.css';

const View = withNotifications(
  withGlobalAccounts(
    withCredits(
      withApollo(
        withAccountInformation(({ children }: { children: React.ReactNode }) => <>{children}</>),
      ),
    ),
  ),
);

export const AuthorizedLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const [isFullMenuOpen, setIsFullMenuOpen] = useState(false);
  return (
    <View>
      <div className="main">
        <div className="sidebar-container">
          <Menu />
        </div>
        <div className="app-content">
          <div className="header-container">
            <div className="menu-header-button">
              <MenuButton onClick={() => setIsFullMenuOpen(true)} />
            </div>
            <Header />
          </div>
          {isFullMenuOpen && (
            <div className={'full-screen-menu-container'}>
              <Menu onClose={() => setIsFullMenuOpen(false)} />
            </div>
          )}

          <main className="page-content">{children}</main>
        </div>
      </div>
    </View>
  );
};

export default AuthorizedLayout;
