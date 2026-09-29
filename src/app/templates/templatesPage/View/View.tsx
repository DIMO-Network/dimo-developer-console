'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { capitalize } from 'lodash';
import { Header } from '@/app/templates/templatesPage/Header';
import { useTemplateSearch } from '@/hooks/queries/useTemplateSearch';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { StatusChip, type StatusTone } from '@/components/StatusChip';

const STATUS_COPY: Record<string, { label: string; tone: StatusTone; hint: string }> = {
  'ok': { label: 'Template', tone: 'on', hint: '' },
  'missing': {
    label: 'No template yet',
    tone: 'off',
    hint: 'This model-year exists but no template has been imported for it.',
  },
  'invalid-id': {
    label: 'Id cannot be a template',
    tone: 'error',
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
                  <StatusChip tone={STATUS_COPY[r.status].tone}>
                    {STATUS_COPY[r.status].label}
                  </StatusChip>
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
