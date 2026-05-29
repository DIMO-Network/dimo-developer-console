'use client';

import { FC, useState, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { Loader } from '@/components/Loader';
import { Button } from '@/components/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/16/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const GET_VEHICLES_FOR_EXPLORER = gql(`
  query GetVehiclesForExplorer($clientId: Address!, $first: Int, $last: Int, $before: String, $after: String) {
    vehicles(filterBy: { privileged: $clientId }, first: $first, last: $last, before: $before, after: $after) {
      totalCount
      pageInfo {
        startCursor
        endCursor
        hasNextPage
        hasPreviousPage
      }
      nodes {
        tokenId
        definition {
          make
          model
          year
        }
      }
    }
  }
`);

const PAGE_SIZE = 10;

interface VehicleNode {
  tokenId: number;
  definition?: {
    make?: string | null;
    model?: string | null;
    year?: number | null;
  } | null;
}

interface Props {
  clientId: string;
  selectedTokenId: number | null;
  onSelectVehicle: (tokenId: number) => void;
}

export const VehicleList: FC<Props> = ({
  clientId,
  selectedTokenId,
  onSelectVehicle,
}) => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<{ after?: string; before?: string }>({
    after: undefined,
    before: undefined,
  });

  const { data, loading, error } = useQuery(GET_VEHICLES_FOR_EXPLORER, {
    variables: { clientId, first: PAGE_SIZE, ...cursors },
  });

  const vehicles: VehicleNode[] = data?.vehicles.nodes ?? [];
  const pageInfo = data?.vehicles.pageInfo;
  const totalCount = data?.vehicles.totalCount ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter((v) => {
      const mmy =
        `${v.definition?.make ?? ''} ${v.definition?.model ?? ''} ${v.definition?.year ?? ''}`.toLowerCase();
      return mmy.includes(q) || String(v.tokenId).includes(q);
    });
  }, [vehicles, search]);

  const handleNext = () => {
    setCursors({ after: pageInfo?.endCursor ?? undefined });
    setPageIndex((i) => i + 1);
  };

  const handlePrev = () => {
    setCursors({ before: pageInfo?.startCursor ?? undefined });
    setPageIndex((i) => i - 1);
  };

  return (
    <div className="flex flex-col gap-3 bg-card rounded-xl p-4 h-full">
      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
        <input
          type="search"
          placeholder="Search vehicles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-accent text-foreground placeholder-text-secondary rounded-lg pl-9 pr-3 py-2 text-sm outline-none border border-transparent focus:border-cta-default"
        />
      </div>

      {/* List */}
      <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
        {loading && <Loader isLoading />}
        {error && <p className="text-sm text-red-400">Failed to load vehicles.</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-text-secondary text-center mt-4">
            No vehicles found.
          </p>
        )}
        {!loading &&
          filtered.map((vehicle) => {
            const mmy = [
              vehicle.definition?.make,
              vehicle.definition?.model,
              vehicle.definition?.year,
            ]
              .filter(Boolean)
              .join(' ');
            const isSelected = vehicle.tokenId === selectedTokenId;
            return (
              <button
                key={vehicle.tokenId}
                onClick={() => {
                  onSelectVehicle(vehicle.tokenId);
                  router.push(`/explorer/${vehicle.tokenId}`);
                }}
                className={`flex flex-col items-start w-full text-left px-3 py-3 rounded-lg border-b border-b-cta-default last:border-b-0 transition-colors ${
                  isSelected
                    ? 'bg-cta-default text-white'
                    : 'hover:bg-accent text-foreground'
                }`}
              >
                <span className="text-sm font-medium">{mmy || 'Unknown vehicle'}</span>
                <span
                  className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-text-secondary'}`}
                >
                  Token #{vehicle.tokenId}
                </span>
              </button>
            );
          })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-text-secondary pt-2 border-t border-t-cta-default">
        <span>
          {totalCount === 0
            ? '0 vehicles'
            : `${pageIndex * PAGE_SIZE + 1}–${Math.min((pageIndex + 1) * PAGE_SIZE, totalCount)} of ${totalCount}`}
        </span>
        <div className="flex gap-1">
          <Button
            className="table-action-button"
            disabled={pageIndex === 0 || loading}
            onClick={handlePrev}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <Button
            className="table-action-button"
            disabled={!pageInfo?.hasNextPage || loading}
            onClick={handleNext}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
