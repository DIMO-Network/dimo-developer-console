'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-[54px] h-[22px] rounded-full bg-card border border-border" />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle dark mode"
      className="flex items-center gap-0.5 bg-card border border-border rounded-full p-0.5 cursor-pointer"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span
        className={cn(
          'w-6 h-[18px] rounded-full flex items-center justify-center text-[10px] transition-colors',
          !isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
        )}
      >
        ☀
      </span>
      <span
        className={cn(
          'w-6 h-[18px] rounded-full flex items-center justify-center text-[10px] transition-colors',
          isDark ? 'bg-primary text-primary-foreground' : 'text-muted-foreground',
        )}
      >
        ☾
      </span>
    </button>
  );
};
