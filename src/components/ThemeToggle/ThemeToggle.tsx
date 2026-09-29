'use client';
import { type FC, useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from '@heroicons/react/24/outline';
import { useTheme } from 'next-themes';

interface IProps {
  variant: 'menu' | 'icon';
  // Sidebar only: show the icon alone, with the label as title/aria-label.
  collapsed?: boolean;
}

export const ThemeToggle: FC<IProps> = ({ variant, collapsed = false }) => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // The stored theme is unknown on the server: render only a same-sized
  // placeholder until mounted so hydration matches.
  if (!mounted) {
    return <div aria-hidden className={variant === 'icon' ? 'size-10' : 'h-10'} />;
  }

  const isDark = theme !== 'light';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');
  const Icon = isDark ? SunIcon : MoonIcon;
  const label = isDark ? 'Light mode' : 'Dark mode';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
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
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={
        collapsed
          ? 'flex h-10 w-full items-center justify-center rounded-control text-body-sm font-medium text-muted transition-colors hover:bg-nav-hover hover:text-fg'
          : 'flex h-10 w-full items-center gap-2.5 rounded-control px-3 text-body-sm font-medium text-muted transition-colors hover:bg-nav-hover hover:text-fg'
      }
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <Icon className="size-5" />
      </span>
      {!collapsed && <span className="min-w-0 truncate">{label}</span>}
    </button>
  );
};
