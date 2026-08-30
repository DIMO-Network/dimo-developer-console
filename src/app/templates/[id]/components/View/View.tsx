'use client';

import React, { useEffect, useMemo, useState, type FC } from 'react';
import { Button } from '@/components/Button';
import { QueryPageWrapper } from '@/components/QueryPageWrapper';
import { TrimGrid } from '@/components/TemplateEditor/TrimGrid';
import { TrimSelectorEditor } from '@/components/TemplateEditor/TrimSelectorEditor';
import { NormalisationPanel } from '@/components/TemplateEditor/NormalisationPanel';
import { EntitlementBanner } from '@/components/TemplateEditor/EntitlementBanner';
import {
  useTemplate,
  usePublishTemplate,
  type PublishFailure,
} from '@/hooks/queries/useTemplate';
import { addTrim, toPayload } from '@/utils/templateGrid';
import { validateDraft } from '@/utils/templateValidate';
import type { Normalisation } from '@/utils/templateCoerce';
import type { Template } from '@/types/template';

interface Props {
  id: string;
}

export const TemplateEditorView: FC<Props> = ({ id }) => {
  const { data, isLoading, error, refetch } = useTemplate(id);
  const publish = usePublishTemplate(id);

  const [draft, setDraft] = useState<Template | null>(null);
  const [notes, setNotes] = useState<Normalisation[]>([]);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState<{
    expected: number | null;
    actual: number;
  } | null>(null);
  const [published, setPublished] = useState<number | null>(null);

  // The version loaded, held apart from the draft: it is what If-Match sends,
  // and it must not move when the draft does.
  const loadedVersion = data?.template?.version ?? null;
  const readOnly = !(data?.entitlement.canPublish ?? false);

  useEffect(() => {
    if (data?.template && draft === null) setDraft(data.template);
  }, [data, draft]);

  const dirty =
    draft !== null &&
    data?.template !== null &&
    JSON.stringify(draft) !== JSON.stringify(data?.template);

  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const localErrors = useMemo(
    () => (draft && data ? validateDraft(draft, data.vocabulary) : []),
    [draft, data],
  );

  const onPublish = async () => {
    if (!draft || loadedVersion === null) return;
    setServerErrors([]);
    setConflict(null);
    try {
      const result = await publish.mutateAsync({
        payload: toPayload(draft),
        version: loadedVersion,
      });
      setPublished(result.version);
      setNotes([]);
      await refetch();
      setDraft(null);
    } catch (err) {
      const failure = err as PublishFailure;
      if (failure.status === 409 && failure.conflict) setConflict(failure.conflict);
      else setServerErrors(failure.errors ?? [failure.message ?? 'Publish failed']);
    }
  };

  return (
    <QueryPageWrapper
      loading={isLoading}
      error={error ?? undefined}
      customErrorMessage="Could not load this template"
    >
      {draft && data && (
        <div className="flex flex-col gap-6">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col">
              <h1 className="text-white">
                {draft.manufacturer.name} {draft.model} {draft.year}
              </h1>
              <span className="font-mono text-xs text-white/50">
                {draft.id} · v{loadedVersion}
                {data.template?.author && ` · last published by ${data.template.author}`}
              </span>
            </div>
            {!readOnly && (
              <div className="flex items-center gap-2">
                <Button className="dark" onClick={() => setDraft(addTrim(draft, ''))}>
                  Add trim
                </Button>
                <Button
                  onClick={onPublish}
                  loading={publish.isPending}
                  disabled={localErrors.length > 0 || !dirty}
                >
                  Publish
                </Button>
              </div>
            )}
          </header>

          <EntitlementBanner entitlement={data.entitlement} />

          {published !== null && (
            <p className="text-primary-300">Published version {published}.</p>
          )}

          {conflict && (
            <div
              role="alert"
              className="flex flex-col gap-2 rounded-xl border border-red-400/40 bg-surface-raised p-4"
            >
              <span className="text-red-400">
                This template moved to version {conflict.actual} while you were editing
                version {conflict.expected}.
              </span>
              <span className="text-white/70">
                Your draft has not been discarded and nothing was published. Reload to see
                the current version, then re-apply your changes.
              </span>
              <div>
                <Button
                  className="dark"
                  onClick={() => {
                    setDraft(null);
                    setConflict(null);
                    refetch();
                  }}
                >
                  Reload
                </Button>
              </div>
            </div>
          )}

          {(localErrors.length > 0 || serverErrors.length > 0) && (
            <ul className="flex flex-col gap-1 rounded-xl border border-red-400/40 bg-surface-raised p-4">
              {[...serverErrors, ...localErrors].map((e) => (
                <li key={e} className="text-red-400">
                  {e}
                </li>
              ))}
            </ul>
          )}

          <NormalisationPanel notes={notes} onDismiss={() => setNotes([])} />

          <TrimGrid
            template={draft}
            vocab={data.vocabulary}
            readOnly={readOnly}
            onChange={setDraft}
            onNormalise={(note) => setNotes((prev) => [...prev, note])}
          />

          <div className="flex flex-col gap-3">
            {draft.trims.map((trim, i) => (
              <TrimSelectorEditor
                key={`${trim.name}-${i}`}
                template={draft}
                trimIndex={i}
                readOnly={readOnly}
                onChange={setDraft}
              />
            ))}
          </div>
        </div>
      )}
    </QueryPageWrapper>
  );
};
