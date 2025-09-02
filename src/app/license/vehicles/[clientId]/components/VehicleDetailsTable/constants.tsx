import { ColumnDef, createColumnHelper } from '@tanstack/table-core';
import { GetVehiclesByClientIdQuery } from '@/gql/graphql';

type VehicleNode = GetVehiclesByClientIdQuery['vehicles']['nodes'][0];
const columnHelper = createColumnHelper<VehicleNode>();
export const columns: ColumnDef<VehicleNode>[] = [
  // @ts-expect-error multiple properties are improperly typed, but not sure how to fix it
  columnHelper.accessor('tokenId', {
    header: 'Vehicle token ID',
  }),
  // @ts-expect-error multiple properties are improperly typed, but not sure how to fix it
  columnHelper.accessor('tokenDID', {
    header: 'Vehicle token DID',
  }),
  columnHelper.display({
    id: 'vehicleMMY', // Unique ID since we're not directly accessing a property
    header: 'Vehicle MMY',
    cell: (info) => {
      const definition = info.row.original.definition;
      return (
        <p>
          {definition?.make} {definition?.model} {definition?.year}
        </p>
      );
    },
  }),
];
export const PAGE_SIZE = 10;
