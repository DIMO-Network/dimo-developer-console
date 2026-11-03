'use client';
import { useQuery } from '@tanstack/react-query';
import type { LicenseBrands } from '@/services/brand';
import { fetchJson } from '@/utils/fetchJson';

export const licenseBrandsKey = (tokenId: number) => ['license-brands', tokenId] as const;

// A license's workspace and brands, read with GET (not a server action, which
// would queue behind the page's other actions).
export const useLicenseBrands = (tokenId: number) =>
  useQuery({
    queryKey: licenseBrandsKey(tokenId),
    queryFn: () => fetchJson<LicenseBrands>(`/api/licenses/${tokenId}/brands`),
  });
