'use client';

import { useQuery } from '@tanstack/react-query';
import type { SearchResult } from '@/app/api/templates/route';

export interface TemplateSearch {
  manufacturer: { name: string; tokenId: number } | null;
  results: SearchResult[];
}

export const useTemplateSearch = (params: {
  make: string;
  model: string;
  year: string;
}) =>
  useQuery<TemplateSearch>({
    queryKey: ['template-search', params],
    enabled: params.make.trim().length > 0,
    staleTime: 30000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const qs = new URLSearchParams({ make: params.make });
      if (params.model) qs.set('model', params.model);
      if (params.year) qs.set('year', params.year);
      const resp = await fetch(`/api/templates?${qs}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? 'Search failed');
      return json as TemplateSearch;
    },
  });
