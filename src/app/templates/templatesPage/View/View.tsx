'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Header } from '@/app/templates/templatesPage/Header';
import { useTemplateSearch } from '@/hooks/queries/useTemplateSearch';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { TextField } from '@/components/TextField';
import { StatusChip, type StatusTone } from '@/components/StatusChip';

const STATUS_COPY: Record<
  string,
  { labelKey: string; tone: StatusTone; hintKey?: string }
> = {
  'ok': { labelKey: 'search.status.ok', tone: 'on' },
  'missing': {
    labelKey: 'search.status.missing',
    tone: 'off',
    hintKey: 'search.hints.missing',
  },
  'invalid-id': {
    labelKey: 'search.status.invalidId',
    tone: 'error',
    hintKey: 'search.hints.invalidId',
  },
};

export const TemplatesPage = () => {
  const t = useTranslations('templates');
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
            {t(`search.fields.${field}`)}
            <TextField
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              placeholder={
                field === 'make' ? 'Toyota' : field === 'model' ? 'Camry' : '2020'
              }
            />
          </Label>
        ))}
        <Button type="submit">{t('search.submit')}</Button>
      </form>

      <QueryPageWrapper
        loading={isLoading}
        error={error ?? undefined}
        customErrorMessage={t('search.failed')}
      >
        {data && !data.manufacturer && (
          <p className="text-body-sm text-muted">{t('search.noMake')}</p>
        )}
        <ul className="flex flex-col divide-y divide-outline rounded-card bg-card">
          {(data?.results ?? []).map((r) => {
            const hintKey = STATUS_COPY[r.status].hintKey;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="truncate font-mono text-code text-fg">{r.id}</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip tone={STATUS_COPY[r.status].tone}>
                      {t(STATUS_COPY[r.status].labelKey)}
                    </StatusChip>
                    {r.status === 'ok' && (
                      <span className="text-label text-muted">
                        {t('search.versionTrims', {
                          version: r.version ?? 0,
                          trims: r.trims ?? 0,
                        })}
                      </span>
                    )}
                  </div>
                  {hintKey && (
                    <span className="text-body-sm text-muted">{t(hintKey)}</span>
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
                    {r.status === 'ok' ? t('search.open') : t('search.create')}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </QueryPageWrapper>
    </div>
  );
};
