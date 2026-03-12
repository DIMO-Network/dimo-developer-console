import { type FC, PropsWithChildren, useContext } from 'react';

import classNames from 'classnames';
import Link from 'next/link';

import './MenuItem.css';
import { LayoutContext } from '@/context/LayoutContext';

interface IProps {
  link: string | (() => void);
  disabled: boolean;
  external: boolean;
  iconClassName: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: FC<any>;
  isHighlighted?: boolean;
}

export const MenuItem: FC<IProps> = ({
  link,
  external,
  disabled,
  icon: Icon,
  iconClassName,
  label,
  isHighlighted,
}) => {
  const { isFullScreenMenuOpen, setIsFullScreenMenuOpen } = useContext(LayoutContext);

  const closeFullScreenMenu = () => {
    if (isFullScreenMenuOpen) {
      setIsFullScreenMenuOpen(false);
    }
  };

  const handleFunctionClick = () => {
    if (typeof link === 'function') {
      link();
      closeFullScreenMenu();
    }
  };

  const Wrapper: FC<PropsWithChildren> = ({ children }) => {
    if (typeof link === 'function') {
      return <button onClick={handleFunctionClick}>{children}</button>;
    }
    return (
      <Link
        href={disabled ? '#' : link}
        target={external ? '_blank' : '_self'}
        onClick={closeFullScreenMenu}
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
