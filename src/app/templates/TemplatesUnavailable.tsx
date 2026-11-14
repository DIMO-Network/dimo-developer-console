import React, { type FC } from 'react';
import { useTranslations } from 'next-intl';

export const TemplatesUnavailable: FC = () => {
  const t = useTranslations('templates');
  return (
    <div className="flex w-full flex-col items-center justify-center gap-1.5 rounded-card bg-card p-10 text-center">
      <p className="text-card-title text-ink">{t('unavailable.title')}</p>
      <p className="text-body-sm text-muted">{t('unavailable.description')}</p>
    </div>
  );
};
