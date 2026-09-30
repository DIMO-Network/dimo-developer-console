'use client';
import { FC } from 'react';
import type { Subject, SubjectGraph } from '@/services/subjects/graph';
import type { LatestIndexHeader } from '@/hooks/subjects/useSubjectFreshness';
import type { LocalDeveloperLicense } from '@/types/webhook';
import type { VehicleTab } from '../hooks/useVehicleUrlState';
import { SummaryTab } from './tabs/SummaryTab';

export type SubjectContext = {
  clientId: string;
  license: LocalDeveloperLicense;
  graph: SubjectGraph;
  chainId: number;
  freshness: Record<string, LatestIndexHeader>;
  onBrowseRaw: (did: string) => void;
};

export const SubjectView: FC<{
  subject: Subject;
  tab: VehicleTab;
  ctx: SubjectContext;
}> = ({ subject, tab, ctx }) => {
  switch (tab) {
    case 'summary':
      return <SummaryTab subject={subject} ctx={ctx} />;
    case 'raw':
      return null; // Task 7: <RawDataTab subject={subject} ctx={ctx} />
    case 'signals':
      return null; // Task 8: <SignalsTab subject={subject} ctx={ctx} />
    case 'trips':
      return null; // Task 9: <TripsTab subject={subject} ctx={ctx} />
    case 'documents':
      return null; // Task 10: <DocumentsTab subject={subject} ctx={ctx} />
  }
};
