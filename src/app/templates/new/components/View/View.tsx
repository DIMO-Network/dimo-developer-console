'use client';

import React, { useMemo, useState, type FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { usePublishTemplate, type PublishFailure } from '@/hooks/queries/useTemplate';
import { validateDraft } from '@/utils/templateValidate';
import { toPayload } from '@/utils/templateGrid';
import type { DeviceType, Template } from '@/types/template';

// A create form needs no vocabulary: a new template starts with no attributes
// at all -- 5,152 of the emitted set are attribute-free and that is a real,
// valid template. The editor fetches the live vocabulary once the template
// exists.
const EMPTY_VOCAB: DeviceType = { id: 'vehicle', name: 'Vehicle', attributes: [] };

/** `presetId` comes from the browse page's Create link, e.g. toyota_supra_2020. */
export const NewTemplateView: FC<{ presetId?: string }> = ({ presetId }) => {
  const router = useRouter();
  const [form, setForm] = useState(() => {
    const parts = (presetId ?? '').split('_');
    const blank = {
      makeSlug: '',
      modelSlug: '',
      year: '',
      manufacturerName: '',
      modelName: '',
      trimName: '',
    };
    return parts.length === 3
      ? { ...blank, makeSlug: parts[0], modelSlug: parts[1], year: parts[2] }
      : blank;
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [exists, setExists] = useState(false);

  const id = `${form.makeSlug}_${form.modelSlug}_${form.year}`;
  // The id is derived from the form, so the mutation has to be created after it
  // -- usePublishTemplate('') would PUT to /api/templates/ and 404.
  const publish = usePublishTemplate(id);

  const draft = useMemo<Template>(
    () =>
      ({
        id,
        deviceType: 'vehicle',
        manufacturer: { slug: form.makeSlug, name: form.manufacturerName },
        model: form.modelName,
        year: Number(form.year),
        attributes: {},
        trims: [{ name: form.trimName, attributes: {} }],
      }) as Template,
    [id, form],
  );

  const field = (key: keyof typeof form, label: string, placeholder: string) => (
    <label key={key} className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-white/50">{label}</span>
      <input
        aria-label={label}
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className="h-10 rounded-md bg-dark-grey-950 px-3 text-white placeholder:text-white/25"
      />
    </label>
  );

  const onCreate = async () => {
    setExists(false);
    const found = validateDraft(draft, EMPTY_VOCAB);
    if (found.length > 0) {
      setErrors(found);
      return;
    }
    setErrors([]);
    try {
      // version null -> the route sends If-None-Match: *, so a template that
      // already exists comes back as a conflict rather than a silent overwrite.
      await publish.mutateAsync({ payload: toPayload(draft), version: null });
      router.push(`/templates/${id}`);
    } catch (err) {
      const failure = err as PublishFailure;
      if (failure.status === 409) setExists(true);
      else
        setErrors(
          failure.errors ?? [failure.message ?? 'Could not create this template'],
        );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-white">New template</h1>
      <p className="text-white/50">
        A model-year and the trims it shipped in. Creating one publishes immediately and
        is attributed to you — nothing points at it yet, so nothing can be re-described.
      </p>

      <div className="grid gap-3 md:grid-cols-3">
        {field('makeSlug', 'Make slug', 'ineos')}
        {field('modelSlug', 'Model slug', 'grenadier')}
        {field('year', 'Year', '2024')}
        {field('manufacturerName', 'Manufacturer name', 'INEOS')}
        {field('modelName', 'Model name', 'Grenadier')}
        {field('trimName', 'First trim', 'Trialmaster')}
      </div>

      <p className="font-mono text-white/70" data-testid="derived-id">
        {id}
      </p>

      {errors.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-xl border border-red-400/40 bg-surface-raised p-4">
          {errors.map((e) => (
            <li key={e} className="text-red-400">
              {e}
            </li>
          ))}
        </ul>
      )}

      {exists && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-red-400/40 bg-surface-raised p-4"
        >
          <span className="text-red-400">A template with this id already exists.</span>
          <Link href={`/templates/${id}`} className="button">
            Open it
          </Link>
        </div>
      )}

      <div>
        <Button onClick={onCreate} loading={publish.isPending}>
          Create template
        </Button>
      </div>
    </div>
  );
};
