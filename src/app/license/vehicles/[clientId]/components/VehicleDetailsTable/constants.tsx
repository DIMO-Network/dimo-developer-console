import { ColumnDef, createColumnHelper } from '@tanstack/table-core';
import { useState } from 'react';
import { LastSeenCell } from './LastSeenCell';

// Structural row type: satisfied by both GetVehiclesByClientId nodes and the
// GetVehicleForLicense vehicle.
export type VehicleRow = {
  tokenId: number;
  tokenDID: string;
  definition?: {
    make?: string | null;
    model?: string | null;
    year?: number | null;
  } | null;
  aftermarketDevice?: { manufacturer?: { name?: string | null } | null } | null;
  syntheticDevice?: { connection?: { name?: string | null } | null } | null;
};
const columnHelper = createColumnHelper<VehicleRow>();

function ActionsCell({
  tokenId,
  onRenounce,
}: {
  tokenId: number;
  onRenounce: (tokenId: number) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative flex justify-end" onClick={(e) => e.stopPropagation()}>
      <button
        className="flex size-8 items-center justify-center rounded-full text-body leading-none text-muted transition-colors hover:bg-control hover:text-ink"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Row actions"
      >
        ⋯
      </button>
      {open && (
        <>
          {/* backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-control border border-outline bg-overlay p-1 shadow-float">
            <button
              className="w-full rounded-chip px-3 py-2 text-left text-body-sm text-negative transition-colors hover:bg-negative-soft"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onRenounce(tokenId);
              }}
            >
              Renounce access
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export const buildColumns = (
  simulatedTokenIds: Set<number>,
  onRenounce: (tokenId: number) => void,
  opts: { showSources?: boolean; showLastSeen?: boolean; clientId: string } = {
    clientId: '',
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): ColumnDef<VehicleRow, any>[] => [
  columnHelper.accessor('tokenId', {
    header: 'Vehicle token ID',
    cell: (i) => <span className="whitespace-nowrap">{i.getValue()}</span>,
  }),
  columnHelper.accessor('tokenDID', {
    header: 'Vehicle token DID',
    cell: (i) => <span className="font-mono text-code">{i.getValue()}</span>,
    // Phones keep the ID, vehicle and last seen; the DID is on the vehicle page.
    meta: { className: 'hidden md:table-cell' },
  }),
  columnHelper.display({
    id: 'vehicleMMY',
    header: 'Vehicle MMY',
    cell: (info) => {
      const { tokenId, definition } = info.row.original;
      const isSimulated = simulatedTokenIds.has(tokenId);
      return (
        <span className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
          <span>
            {definition?.make} {definition?.model} {definition?.year}
          </span>
          {isSimulated && (
            <span className="shrink-0 whitespace-nowrap rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
              Simulated
            </span>
          )}
        </span>
      );
    },
  }),
  ...(opts.showSources
    ? [
        columnHelper.display({
          id: 'sources',
          header: 'Sources',
          cell: (info) => {
            const { aftermarketDevice, syntheticDevice } = info.row.original;
            const names = [
              aftermarketDevice?.manufacturer?.name,
              syntheticDevice?.connection?.name,
            ].filter((n): n is string => !!n);
            if (!names.length) return <span className="text-muted">—</span>;
            return (
              <span className="flex flex-wrap gap-1">
                {names.map((n) => (
                  <span
                    key={n}
                    className="whitespace-nowrap rounded-chip bg-highest px-2 py-0.5 text-label text-muted"
                  >
                    {n}
                  </span>
                ))}
              </span>
            );
          },
        }),
      ]
    : []),
  ...(opts.showLastSeen
    ? [
        columnHelper.display({
          id: 'lastSeen',
          header: 'Last seen',
          cell: (info) => (
            <LastSeenCell asset={info.row.original.tokenDID} clientId={opts.clientId} />
          ),
        }),
      ]
    : []),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: (info) => (
      <ActionsCell tokenId={info.row.original.tokenId} onRenounce={onRenounce} />
    ),
  }),
];

export const PAGE_SIZE = 10;
