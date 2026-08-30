'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import type { DeviceType, Template, TemplatePayload } from '@/types/template';
import type { Entitlement } from '@/services/templateEntitlement';

export interface TemplateBundle {
  template: Template | null;
  vocabulary: DeviceType;
  entitlement: Entitlement;
}

export interface PublishFailure {
  status: number;
  message?: string;
  errors?: string[];
  conflict?: { expected: number | null; actual: number };
}

export const useTemplate = (id: string) =>
  useQuery<TemplateBundle>({
    queryKey: ['template', id],
    // The version held here is what If-Match sends. A cached one would send a
    // stale precondition and turn a real conflict into a silent rebase.
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const resp = await fetch(`/api/templates/${encodeURIComponent(id)}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? 'Failed to load template');
      return json as TemplateBundle;
    },
  });

export const usePublishTemplate = (id: string) =>
  useMutation<
    Template,
    PublishFailure,
    { payload: TemplatePayload; version: number | null }
  >({
    mutationFn: async ({ payload, version }) => {
      const resp = await fetch(`/api/templates/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(version === null ? {} : { 'If-Match': `"${version}"` }),
        },
        body: JSON.stringify(payload),
      });
      const json = await resp.json();
      if (!resp.ok) {
        throw {
          status: resp.status,
          message: json.error,
          errors: json.errors,
          conflict: json.conflict,
        } as PublishFailure;
      }
      return json.template as Template;
    },
  });
