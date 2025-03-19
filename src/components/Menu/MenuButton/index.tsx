import { Bars3Icon } from '@heroicons/react/24/solid';
import React, { FC } from 'react';

interface MenuButtonProps {
  onClick: () => void;
}
export const MenuButton: FC<MenuButtonProps> = ({ onClick }) => (
  <button
    className={'bg-surface-default rounded-2xl size-12 flex items-center justify-center'}
    onClick={onClick}
  >
    <Bars3Icon className={'size-6'} />
  </button>
);
