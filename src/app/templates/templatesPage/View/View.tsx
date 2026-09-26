'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { capitalize } from 'lodash';
import classnames from 'classnames';
import { Header } from '@/app/templates/templatesPage/Header';
import { useTemplateSearch } from '@/hooks/queries/useTemplateSearch';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';

const STATUS_COPY: Record<string, { label: string; dot: string; hint: string }> = {
  'ok': { label: 'Template', dot: 'bg-positive', hint: '' },
  'missing': {
    label: 'No template yet',
    dot: 'bg-muted',
    hint: 'This model-year exists but no template has been imported for it.',
  },
  'invalid-id': {
    label: 'Id cannot be a template',
    dot: 'bg-negative',
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
          <Label key={field}>
            {capitalize(field)}
            <TextField
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={
                field === 'make' ? 'Toyota' : field === 'model' ? 'Camry' : '2020'
              }
            />
          </Label>
        ))}
        <Button type="submit">Search</Button>
      </form>

      <QueryPageWrapper
        loading={isLoading}
        error={error ?? undefined}
        customErrorMessage="There was a problem searching device definitions"
      >
        {data && !data.manufacturer && (
          <p className="text-body-sm text-muted">
            No manufacturer matched that name or slug.
          </p>
        )}
        <ul className="flex flex-col divide-y divide-outline rounded-card bg-card">
          {(data?.results ?? []).map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="truncate font-mono text-code text-fg">{r.id}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-chip bg-control px-2 py-0.5 text-label text-muted">
                    <span
                      className={classnames(
                        'size-1.5 flex-shrink-0 rounded-full',
                        STATUS_COPY[r.status].dot,
                      )}
                    />
                    {STATUS_COPY[r.status].label}
                  </span>
                  {r.status === 'ok' && (
                    <span className="text-label text-muted">
                      v{r.version} · {r.trims} trim{r.trims === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                {STATUS_COPY[r.status].hint && (
                  <span className="text-body-sm text-muted">
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
                  className="button secondary"
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
