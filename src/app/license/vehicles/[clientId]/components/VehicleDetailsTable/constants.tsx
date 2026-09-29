import { ColumnDef, createColumnHelper } from '@tanstack/table-core';
import { GetVehiclesByClientIdQuery } from '@/gql/graphql';

type VehicleNode = GetVehiclesByClientIdQuery['vehicles']['nodes'][0];
const columnHelper = createColumnHelper<VehicleNode>();

export const buildColumns = (
  simulatedTokenIds: Set<number>,
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
            <span className="rounded-chip border border-outline bg-highest px-1.5 py-0.5 text-label text-muted leading-none">
              Simulated
            </span>
          )}
        </span>
      );
    },
  }),
];

export const PAGE_SIZE = 10;
