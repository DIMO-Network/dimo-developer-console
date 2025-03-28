'use client';
import React, { useContext, useState } from 'react';
import { MenuButton } from '@/components/Menu/MenuButton';
import {
  withCredits,
  withNotifications,
  withGlobalAccounts,
  withApollo,
  withAccountInformation,
  withLayout,
} from '@/hoc';
import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import './AuthorizedLayout.css';
import { LayoutContext } from '@/context/LayoutContext';

const View = withNotifications(
  withGlobalAccounts(
    withLayout(
      withCredits(
        withApollo(
          withAccountInformation(({ children }: { children: React.ReactNode }) => (
            <>{children}</>
          )),
        ),
      ),
    ),
  ),
);

export const AuthorizedLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const { isFullScreenMenuOpen, setIsFullScreenMenuOpen } = useContext(LayoutContext);
  return (
    <View>
      <div className="main">
        <div className="sidebar-container">
          <Menu />
        </div>
        <div className="app-content">
          <div className="header-container">
            <div className="menu-header-button">
              <MenuButton onClick={() => setIsFullScreenMenuOpen(true)} />
            </div>
            <Header />
          </div>
          {isFullScreenMenuOpen && (
            <div className={'full-screen-menu-container'}>
              <Menu />
            </div>
          )}
          <main className="page-content">{children}</main>
        </div>
      </div>
    </View>
  );
};

export default AuthorizedLayout;
