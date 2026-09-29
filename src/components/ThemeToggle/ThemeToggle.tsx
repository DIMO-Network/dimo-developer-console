'use client';
import { type FC } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/context/ThemeContext';

interface IProps {
  variant: 'menu' | 'icon';
}

export const ThemeToggle: FC<IProps> = ({ variant }) => {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === 'dark' ? SunIcon : MoonIcon;
  const label = theme === 'dark' ? 'Light mode' : 'Dark mode';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        className="flex size-10 items-center justify-center rounded-full text-muted hover:bg-control hover:text-ink"
      >
        <Icon className="size-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-10 w-full items-center gap-3 rounded-control px-3 text-body-sm font-medium text-muted hover:bg-nav-hover hover:text-fg"
    >
      <Icon className="size-5" />
      {label}
    </button>
  );
};
