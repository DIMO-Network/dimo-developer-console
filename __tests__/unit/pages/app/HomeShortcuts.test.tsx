// The @/hooks barrel loads next/cache and ESM-only wallet libraries, which jsdom can't run;
// this test only calls the pure visibleShortcuts.
jest.mock('@/hooks', () => ({ useUser: jest.fn() }));
import { visibleShortcuts } from '@/app/app/list/components/View/View';

const hrefs = (isMember: boolean, dataAccessEnabled: boolean) =>
  visibleShortcuts(isMember, dataAccessEnabled).map((s) => s.href);

describe('Home shortcuts', () => {
  it('shows owners every shortcut', () => {
    expect(hrefs(false, false)).toEqual([
      '/licenses',
      '/connections',
      '/webhooks',
      '/vehicles',
    ]);
  });

  it('hides owner-only pages from members, and Vehicles while data access is off', () => {
    expect(hrefs(true, true)).toEqual(['/licenses', '/vehicles']);
    expect(hrefs(true, false)).toEqual(['/licenses']);
  });
});
