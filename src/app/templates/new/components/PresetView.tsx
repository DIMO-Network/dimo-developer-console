'use client';

import React, { type FC } from 'react';
import { useSearchParams } from 'next/navigation';

import { NewTemplateView } from './View';

// useSearchParams must sit inside a Suspense boundary, and keeping it out of the
// view leaves the view a pure function of its props for the tests.
export const PresetView: FC = () => {
  const search = useSearchParams();
  return <NewTemplateView presetId={search.get('id') ?? undefined} />;
};
