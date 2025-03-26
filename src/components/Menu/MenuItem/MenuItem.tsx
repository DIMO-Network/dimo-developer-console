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
  isHighlighted?: boolean;
  onClick?: () => void
}

export const MenuItem: FC<IProps> = ({
  link,
  external,
  disabled,
  icon: Icon,
  iconClassName,
  label,
  isHighlighted,
  onClick
}) => {
  return (
    <li
      className={classNames({
        '!text-grey-200/50': disabled,
        'bg-red-900': isHighlighted,
      })}
    >
      <Icon className={iconClassName} />
      <Link
        href={typeof link === 'string' && !disabled ? link : '#'}
        target={external ? '_blank' : '_self'}
        onClick={onClick}
      >
        {label}
      </Link>
    </li>
  );
};
