import React from 'react';
import { useTranslations } from 'next-intl';

export const Header = () => {
  const t = useTranslations('webhooks');
  return <p className="text-body-sm text-muted">{t('page.description')}</p>;
};
