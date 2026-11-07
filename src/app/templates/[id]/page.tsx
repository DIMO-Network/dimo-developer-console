'use client';

import React, { Suspense, use, type FC } from 'react';
import { useTranslations } from 'next-intl';

import { TemplateEditorView } from './components/View';

const TemplatePage: FC<{ params: Promise<{ id: string }> }> = ({ params }) => {
  const t = useTranslations('templates');
  const { id } = use(params);
  return (
    <Suspense fallback={<div>{t('loading')}</div>}>
      <TemplateEditorView id={decodeURIComponent(id)} />
    </Suspense>
  );
};

export default TemplatePage;
