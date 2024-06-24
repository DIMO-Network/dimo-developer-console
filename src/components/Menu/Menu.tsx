import { type FC } from 'react';

import { MenuItem } from '@/components/Menu/MenuItem';
import { mainMenu, bottomMenu } from '@/config/navigation';

import './Menu.css';

interface IProps {}

export const Menu: FC<IProps> = () => {
  return (
    <aside className="main-menu">
      <ul className="top-menu">
        {mainMenu.map((item) => {
          return <MenuItem key={item.link} {...item} />;
        })}
      </ul>
      <ul className="bottom-menu">
        {bottomMenu.map((item) => {
          return <MenuItem key={item.label} {...item} />;
        })}
      </ul>
    </aside>
  );
};
