import { type FC, useContext } from 'react';

import { MenuItem } from '@/components/Menu/MenuItem';
import { mainMenu, bottomMenu } from '@/config/navigation';

import './Menu.css';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { XMarkIcon } from '@heroicons/react/24/solid';
import { LayoutContext } from '@/context/LayoutContext';

export const Menu: FC = () => {
  const { isFullScreenMenuOpen, setIsFullScreenMenuOpen } = useContext(LayoutContext);
  const pathname = usePathname();
  const onClick = () => {
    if (isFullScreenMenuOpen) {
      setIsFullScreenMenuOpen(false);
    }
  };

  return (
    <div className={'main-menu'}>
      <ul className="top-menu">
        <div className={'flex flex-row justify-between'}>
          <Image
            src={'/images/dimo_dev_logo.svg'}
            alt="DIMO Logo"
            width={176}
            height={24}
            className={'mb-10'}
          />
          <div className={'md:hidden'}>
            <button onClick={() => setIsFullScreenMenuOpen(false)}>
              <XMarkIcon className={'size-6 text-white'} />
            </button>
          </div>
        </div>

        {mainMenu.map((item) => {
          return (
            <MenuItem
              key={item.link}
              {...item}
              isHighlighted={pathname === item.link}
              onClick={onClick}
            />
          );
        })}
      </ul>
      <ul className="bottom-menu">
        {bottomMenu.map((item) => {
          return (
            <MenuItem
              key={item.label}
              {...item}
              isHighlighted={pathname === item.link}
              onClick={onClick}
            />
          );
        })}
      </ul>
    </div>
  );
};
