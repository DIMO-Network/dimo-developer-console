import { type FC, useContext } from 'react';
import Link from 'next/link';
import { LayoutContext } from '@/context/LayoutContext';
import { cn } from '@/lib/utils';

interface IProps {
  link: string | (() => void);
  disabled: boolean;
  external: boolean;
  iconClassName: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: FC<any>;
  isHighlighted?: boolean;
  isCollapsed?: boolean;
}

export const MenuItem: FC<IProps> = ({
  link,
  external,
  disabled,
  icon: Icon,
  iconClassName,
  label,
  isHighlighted,
  isCollapsed,
}) => {
  const { isFullScreenMenuOpen, setIsFullScreenMenuOpen } = useContext(LayoutContext);

  const closeFullScreenMenu = () => {
    if (isFullScreenMenuOpen) setIsFullScreenMenuOpen(false);
  };

  const inner = isCollapsed ? (
    <span className="sr-only">{label}</span>
  ) : (
    <span className="min-w-0 truncate">{label}</span>
  );

  return (
    <li
      title={isCollapsed ? label : undefined}
      className={cn(
        'flex h-10 flex-row items-center gap-2.5 rounded-control px-3 text-body-sm font-medium transition-colors',
        'text-muted hover:bg-nav-hover hover:text-fg',
        isHighlighted && 'bg-nav-active text-ink hover:bg-nav-active hover:text-ink',
        disabled && 'opacity-40 pointer-events-none',
        isCollapsed && 'justify-center gap-0 px-0',
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Icon className={cn(iconClassName, 'shrink-0', isHighlighted && 'text-ink')} />
      </span>
      {typeof link === 'function' ? (
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={() => {
            link();
            closeFullScreenMenu();
          }}
        >
          {inner}
        </button>
      ) : (
        <Link
          href={disabled ? '#' : link}
          target={external ? '_blank' : '_self'}
          onClick={closeFullScreenMenu}
          className="min-w-0"
        >
          {inner}
        </Link>
      )}
    </li>
  );
};
