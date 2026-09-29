'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/app/templates/templatesPage/Header';
import { useTemplateSearch } from '@/hooks/queries/useTemplateSearch';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { Button } from '@/components/Button';

const STATUS_COPY: Record<string, { label: string; className: string; hint: string }> = {
  'ok': { label: 'Template', className: 'text-white', hint: '' },
  'missing': {
    label: 'No template yet',
    className: 'text-white/50',
    hint: 'This model-year exists but no template has been imported for it.',
  },
  'invalid-id': {
    label: 'Id cannot be a template',
    className: 'text-red-400',
    hint: 'This device definition id does not match the template id pattern, so it cannot be edited until the id is corrected.',
  },
};

export const TemplatesPage = () => {
  const [form, setForm] = useState({ make: '', model: '', year: '' });
  const [query, setQuery] = useState(form);
  const { data, isLoading, error } = useTemplateSearch(query);

  return (
    <div className="flex flex-col gap-6">
      <Header />

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(form);
        }}
      >
        {(['make', 'model', 'year'] as const).map((field) => (
          <label key={field} className="flex flex-col gap-1 text-white/50">
            <span className="text-xs uppercase tracking-wide">{field}</span>
            <input
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={
                field === 'make' ? 'Toyota' : field === 'model' ? 'Camry' : '2020'
              }
              className="h-10 rounded-full bg-dark-grey-950 px-4 text-white placeholder:text-white/25"
            />
          </label>
        ))}
        <Button type="submit">Search</Button>
      </form>

      <QueryPageWrapper
        loading={isLoading}
        error={error ?? undefined}
        customErrorMessage="There was a problem searching device definitions"
      >
        {data && !data.manufacturer && (
          <p className="text-white/50">No manufacturer matched that name or slug.</p>
        )}
        <ul className="flex flex-col divide-y divide-cta-default rounded-xl border border-cta-default bg-surface-default">
          {(data?.results ?? []).map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex flex-col">
                <span className="font-mono text-white">{r.id}</span>
                <span className={`text-xs ${STATUS_COPY[r.status].className}`}>
                  {STATUS_COPY[r.status].label}
                  {r.status === 'ok' &&
                    ` · v${r.version} · ${r.trims} trim${r.trims === 1 ? '' : 's'}`}
                </span>
                {STATUS_COPY[r.status].hint && (
                  <span className="pt-1 text-xs text-white/40">
                    {STATUS_COPY[r.status].hint}
                  </span>
                )}
              </div>
              {r.status !== 'invalid-id' && (
                <Link
                  href={
                    r.status === 'ok'
                      ? `/templates/${r.id}`
                      : `/templates/new?id=${encodeURIComponent(r.id)}`
                  }
                  className="button"
                >
                  {r.status === 'ok' ? 'Open' : 'Create'}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </QueryPageWrapper>
    </div>
  );
};
