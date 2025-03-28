import { type FC, PropsWithChildren } from 'react';

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
  onClick?: () => void;
}

export const MenuItem: FC<IProps> = ({
  link,
  external,
  disabled,
  icon: Icon,
  iconClassName,
  label,
  isHighlighted,
  onClick,
}) => {
  const handleButtonClick = (linkFn: () => void) => {
    linkFn();
    onClick?.();
  };

  const Wrapper: FC<PropsWithChildren> = ({ children }) => {
    if (typeof link === 'function') {
      return <button onClick={() => handleButtonClick(link)}>{children}</button>;
    }
    return (
      <Link
        href={disabled ? '#' : link}
        target={external ? '_blank' : '_self'}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  };
  return (
    <li
      className={classNames({
        '!text-grey-200/50': disabled,
        'bg-red-900': isHighlighted,
      })}
    >
      <Icon className={iconClassName} />
      <Wrapper>{label}</Wrapper>
    </li>
  );
};
