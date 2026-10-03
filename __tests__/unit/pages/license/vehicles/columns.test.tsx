import { buildColumns } from '@/app/license/vehicles/[clientId]/components/VehicleDetailsTable/constants';

const ids = (canRenounce?: boolean) =>
  buildColumns(new Set(), jest.fn(), { clientId: '0xaaa', canRenounce }).map(
    (c) =>
      (c as { id?: string; accessorKey?: string }).id ??
      (c as { accessorKey?: string }).accessorKey,
  );

describe('vehicle table columns', () => {
  it('offers Renounce (the actions column) only to owners', () => {
    expect(ids(undefined)).toContain('actions');
    expect(ids(true)).toContain('actions');
    expect(ids(false)).not.toContain('actions');
  });
});
