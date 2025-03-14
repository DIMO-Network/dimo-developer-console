import { type FC } from 'react';

import classNames from 'classnames';
import Link from 'next/link';

import './MenuItem.css';

interface IProps {
  link: string | (() => void);
  disabled: boolean;
  external: boolean;
  iconClassName: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: FC<any>;
}

export const MenuItem: FC<IProps> = ({
  link,
  external,
  disabled,
  icon: Icon,
  iconClassName,
  label,
}) => {
  return (
    <li
      className={classNames({
        '!text-grey-200/50': disabled,
      })}
    >
      <Icon className={iconClassName} />
      <Link
        href={typeof link === 'string' && !disabled ? link : '#'}
        target={external ? '_blank' : '_self'}
        onClick={typeof link === 'function' && !disabled ? link : () => {}}
      >
        {label}
      </Link>
    </li>
  );
};
