'use client';
import { type ChangeEvent, type FC, useTransition } from 'react';
import { LanguageIcon } from '@heroicons/react/24/outline';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { setLocale } from '@/i18n/actions';
import { LOCALE_LABELS, LOCALES, type Locale } from '@/i18n/locale';
import { cn } from '@/lib/utils';

interface IProps {
  variant: 'menu' | 'icon';
  // Sidebar only: show the icon alone, with the label as title.
  collapsed?: boolean;
}

// A real <select> laid invisibly over a ThemeToggle-style control: the OS
// picker, keyboard and screen readers come for free, and each option carries
// its own lang so it is read and drawn in its language.
export const LanguageSwitcher: FC<IProps> = ({ variant, collapsed = false }) => {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Not disabled while pending: that would drop keyboard focus to the body.
  const onChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (isPending) return;
    const next = event.target.value as Locale;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  };

  const showLabel = variant === 'menu' && !collapsed;

  return (
    <div
      className={cn(
        'relative flex items-center text-muted transition-colors hover:text-fg has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus-ring',
        variant === 'icon'
          ? 'size-10 justify-center rounded-full hover:bg-control hover:text-ink'
          : 'h-10 w-full rounded-control text-body-sm font-medium hover:bg-nav-hover',
        showLabel && 'gap-2.5 px-3',
        variant === 'menu' && collapsed && 'justify-center',
      )}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <LanguageIcon aria-hidden className="size-5" />
      </span>
      {showLabel && (
        <span lang={locale} className="min-w-0 truncate">
          {LOCALE_LABELS[locale]}
        </span>
      )}
      <select
        aria-label={t('languageSwitcher.label')}
        title={collapsed ? t('languageSwitcher.label') : undefined}
        value={locale}
        onChange={onChange}
        aria-busy={isPending}
        className="absolute inset-0 size-full cursor-pointer opacity-0 aria-busy:cursor-wait"
      >
        {LOCALES.map((code) => (
          <option key={code} value={code} lang={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </div>
  );
};
