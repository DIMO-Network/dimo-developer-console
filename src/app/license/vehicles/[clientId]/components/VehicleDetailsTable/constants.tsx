import { ColumnDef, createColumnHelper } from '@tanstack/table-core';
import { useState } from 'react';
import { GetVehiclesByClientIdQuery } from '@/gql/graphql';

type VehicleNode = GetVehiclesByClientIdQuery['vehicles']['nodes'][0];
const columnHelper = createColumnHelper<VehicleNode>();

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
        className="px-2 py-1 rounded hover:bg-accent text-text-secondary text-lg leading-none"
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
          <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded border border-border bg-accent shadow-lg">
            <button
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-surface-overlay"
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
): ColumnDef<VehicleNode>[] => [
  // @ts-expect-error multiple properties are improperly typed, but not sure how to fix it
  columnHelper.accessor('tokenId', {
    header: 'Vehicle token ID',
  }),
  // @ts-expect-error multiple properties are improperly typed, but not sure how to fix it
  columnHelper.accessor('tokenDID', {
    header: 'Vehicle token DID',
  }),
  columnHelper.display({
    id: 'vehicleMMY',
    header: 'Vehicle MMY',
    cell: (info) => {
      const { tokenId, definition } = info.row.original;
      const isSimulated = simulatedTokenIds.has(tokenId);
      return (
        <span className="flex items-center gap-2">
          <span>
            {definition?.make} {definition?.model} {definition?.year}
          </span>
          {isSimulated && (
            <span className="text-[10px] font-mono tracking-[0.15em] uppercase px-1.5 py-0.5 rounded border border-border text-text-secondary bg-accent leading-none">
              Simulated
            </span>
          )}
        </span>
      );
    },
  }),
  columnHelper.display({
    id: 'actions',
    header: '',
    cell: (info) => (
      <ActionsCell tokenId={info.row.original.tokenId} onRenounce={onRenounce} />
    ),
  }),
];

export const PAGE_SIZE = 10;
