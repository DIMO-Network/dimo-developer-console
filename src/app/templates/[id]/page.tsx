'use client';

import React, { Suspense, use, type FC } from 'react';

import { TemplateEditorView } from './components/View';

const TemplatePage: FC<{ params: Promise<{ id: string }> }> = ({ params }) => {
  const { id } = use(params);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TemplateEditorView id={decodeURIComponent(id)} />
    </Suspense>
  );
};

export default TemplatePage;
