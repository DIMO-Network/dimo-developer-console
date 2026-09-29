import { Bars3Icon } from '@heroicons/react/24/solid';
import React, { FC, useContext } from 'react';
import { LayoutContext } from '@/context/LayoutContext';

export const MenuButton: FC = () => {
  const { setIsFullScreenMenuOpen } = useContext(LayoutContext);
  const onPress = () => {
    setIsFullScreenMenuOpen(true);
  };

  return (
    <button
      className={
        'flex size-10 items-center justify-center rounded-full text-muted hover:bg-control hover:text-ink'
      }
      aria-label="Open menu"
      onClick={onPress}
    >
      <Bars3Icon className={'size-6'} />
    </button>
  );
};
