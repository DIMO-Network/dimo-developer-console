'use client';
import React, {useState} from 'react';

import { Header } from '@/components/Header';
import { Menu } from '@/components/Menu';
import {
  withCredits,
  withNotifications,
  withNextSession,
  withGlobalAccounts,
} from '@/hoc';

import './AuthorizedLayout.css';
import {MenuButton} from "@/components/Menu/MenuButton";
import clsx from "classnames";

export const AuthorizedLayout = withNextSession(
  withNotifications(
    withGlobalAccounts(
      withCredits(
         ({
          children,
        }: Readonly<{
          children: React.ReactNode;
        }>) => {
           const [isFullMenuOpen, setIsFullMenuOpen] = useState(false);
           return (
            <div className={"main"}>
              <div className="sidebar-container">
                <Menu />
              </div>
              <div className="app-content">
                <div className="header-container">
                  <div className="menu-header-button">
                    <MenuButton onClick={() => setIsFullMenuOpen(true)} />
                  </div>
                  <Header/>
                </div>
                <div className={clsx('full-screen-menu-container', isFullMenuOpen ? 'flex' : 'hidden')}>
                  <Menu onClose={() => setIsFullMenuOpen(false)}/>
                </div>
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
