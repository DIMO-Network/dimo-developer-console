import { Bars3Icon } from '@heroicons/react/24/solid';
import React, { FC, useContext } from 'react';
import { LayoutContext } from '@/context/LayoutContext';

export const MenuButton: FC = () => {
  const { setIsFullScreenMenuOpen } = useContext(LayoutContext);
  const onPress = () => {
    console.log('this was called');
    setIsFullScreenMenuOpen(true);
  };
  return (
    <button
      className={
        'bg-surface-default rounded-2xl size-12 flex items-center justify-center'
      }
      onClick={onPress}
    >
      <Bars3Icon className={'size-6'} />
    </button>
  );
};
