import { HTMLAttributes, type FC } from 'react';
import Link from 'next/link';

import './MenuItem.css';

interface IProps {
  link: string;
  iconClassName: string;
  label: string;
  icon: FC<HTMLAttributes<HTMLElement>>;
}

export const MenuItem: FC<IProps> = ({
  link,
  icon: Icon,
  iconClassName,
  label,
}) => {
  return (
    <li>
      <Icon className={iconClassName} />
      <Link href={link}>{label}</Link>
    </li>
  );
};
