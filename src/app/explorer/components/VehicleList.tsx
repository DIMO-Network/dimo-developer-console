'use client';

import { FC, useState, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import { useRouter } from 'next/navigation';
import classnames from 'classnames';
import { Loader } from '@/components/Loader';
import { Button } from '@/components/Button';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/16/solid';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// For .table-page-button, the shared round pager button.
import '@/components/Table/Table.css';

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
    <div className="flex h-full flex-col gap-3 rounded-card bg-card p-4">
      {/* Search */}
      <div className="relative flex min-h-10 flex-row items-center rounded-control border border-outline bg-control px-3 transition-[border-color,box-shadow] focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent-soft">
        <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-muted" />
        <input
          type="search"
          placeholder="Search vehicles…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent px-2 text-body-sm text-fg outline-0 placeholder:text-muted"
        />
      </div>

      {/* List */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {loading && <Loader isLoading />}
        {error && (
          <p className="mt-4 text-center text-body-sm text-negative">
            Failed to load vehicles.
          </p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="mt-4 text-center text-body-sm text-muted">No vehicles found.</p>
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
                className={classnames(
                  'flex w-full flex-col items-start rounded-control border-b border-outline px-3 py-3 text-left transition-colors last:border-b-0',
                  isSelected ? 'bg-selected text-accent-ink' : 'text-fg hover:bg-control',
                )}
              >
                <span className="text-body-sm font-medium">
                  {mmy || 'Unknown vehicle'}
                </span>
                <span
                  className={classnames(
                    'mt-0.5 text-label',
                    isSelected ? 'text-accent-ink' : 'text-muted',
                  )}
                >
                  Token #{vehicle.tokenId}
                </span>
              </button>
            );
          })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between border-t border-outline pt-2 text-label text-muted">
        <span>
          {totalCount === 0
            ? '0 vehicles'
            : `${pageIndex * PAGE_SIZE + 1}–${Math.min((pageIndex + 1) * PAGE_SIZE, totalCount)} of ${totalCount}`}
        </span>
        <div className="flex gap-1">
          <Button
            variant="secondary"
            className="table-page-button"
            disabled={pageIndex === 0 || loading}
            onClick={handlePrev}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            className="table-page-button"
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
