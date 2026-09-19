'use client';

import React, { Suspense, type FC } from 'react';
import { useSearchParams } from 'next/navigation';

import { NewTemplateView } from './components/View';

// useSearchParams must sit inside a Suspense boundary, and keeping it out of the
// view leaves the view a pure function of its props for the tests.
const PresetView: FC = () => {
  const search = useSearchParams();
  return <NewTemplateView presetId={search.get('id') ?? undefined} />;
};

const NewTemplatePage: FC = () => (
  <Suspense fallback={<div>Loading...</div>}>
    <PresetView />
  </Suspense>
);

export default NewTemplatePage;
