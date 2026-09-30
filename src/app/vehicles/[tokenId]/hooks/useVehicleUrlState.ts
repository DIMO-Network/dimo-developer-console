'use client';
import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { SubjectCapability } from '@/services/subjects/graph';

export type VehicleTab = SubjectCapability;
export const TAB_LABELS: Record<VehicleTab, string> = {
  summary: 'Summary',
  signals: 'Signals',
  raw: 'Raw data',
  trips: 'Trips',
  documents: 'Documents',
};
const TABS = new Set<string>(Object.keys(TAB_LABELS));

type Patch = Partial<{ license: string; subject: string; tab: VehicleTab }>;

// ?license=<clientId>&subject=<did|sharing>&tab=<summary|signals|raw|trips|documents>
export const useVehicleUrlState = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const tabParam = params.get('tab');
  const set = useCallback(
    (patch: Patch) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );
  return {
    license: params.get('license') ?? '',
    subject: params.get('subject'),
    tab: (tabParam && TABS.has(tabParam) ? tabParam : null) as VehicleTab | null,
    set,
  };
};
