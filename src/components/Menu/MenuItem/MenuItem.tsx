import { type FC } from 'react';
import Link from 'next/link';

import './MenuItem.css';

interface IProps {
  link: string;
  iconClassName: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: FC<any>;
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
