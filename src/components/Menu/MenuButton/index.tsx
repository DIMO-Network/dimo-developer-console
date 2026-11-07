import { useTranslations } from 'next-intl';
import { Bars3Icon } from '@heroicons/react/24/solid';
import React, { FC, useContext } from 'react';
import { LayoutContext } from '@/context/LayoutContext';

export const MenuButton: FC = () => {
  const t = useTranslations('common');
  const { setIsFullScreenMenuOpen } = useContext(LayoutContext);
  const onPress = () => {
    setIsFullScreenMenuOpen(true);
  };

  return (
    <button
      className={
        'flex size-10 items-center justify-center rounded-full text-muted hover:bg-control hover:text-ink'
      }
      aria-label={t('menu.open')}
      onClick={onPress}
    >
      <Bars3Icon className={'size-6'} />
    </button>
  );
};
