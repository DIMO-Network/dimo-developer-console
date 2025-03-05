import { type FC } from 'react';

import { MenuItem } from '@/components/Menu/MenuItem';
import { mainMenu, bottomMenu } from '@/config/navigation';

import './Menu.css';
import Image from "next/image";
import {usePathname} from "next/navigation";

interface IProps {}

export const Menu: FC<IProps> = () => {
  const pathname = usePathname();
  return (
    <aside className="main-menu">
      <ul className="top-menu">
        <Image
          src={'/images/dimo_dev_logo.svg'}
          alt="DIMO Logo"
          width={176}
          height={24}
          className={'mb-10'}
        />
        {mainMenu.map((item) => {
          return <MenuItem key={item.link} {...item} isHighlighted={pathname === item.link} />;
        })}
      </ul>
      <ul className="bottom-menu">
        {bottomMenu.map((item) => {
          return <MenuItem key={item.label} {...item} isHighlighted={pathname === item.link} />;
        })}
      </ul>
    </aside>
  );
};
