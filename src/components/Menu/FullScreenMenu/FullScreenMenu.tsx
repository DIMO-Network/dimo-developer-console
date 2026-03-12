import React, { useContext } from 'react';
import { LayoutContext } from '@/context/LayoutContext';
import { Menu } from '@/components/Menu';

import './FullScreenMenu.css';

export const FullScreenMenu = () => {
  const { isFullScreenMenuOpen } = useContext(LayoutContext);
  if (!isFullScreenMenuOpen) {
    return null;
  }
  return (
    <div className={'full-screen-menu-container'}>
      <Menu />
    </div>
  );
};
