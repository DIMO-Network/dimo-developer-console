import { getNavSections, getPageTitle } from '@/config/navigation';

describe('navigation', () => {
  const sections = getNavSections(true);
  const workspace = sections.find((s) => s.labelKey === 'navigation.sections.workspace')!;
  const resources = sections.find((s) => s.labelKey === 'navigation.sections.resources')!;

  it('lists Vehicles in Workspace right after Licenses', () => {
    const labels = workspace.items.map((i) => i.labelKey);
    expect(labels.indexOf('navigation.items.vehicles')).toBe(
      labels.indexOf('navigation.items.licenses') + 1,
    );
    expect(
      workspace.items.find((i) => i.labelKey === 'navigation.items.vehicles'),
    ).toMatchObject({
      link: '/vehicles',
      disabled: false,
    });
  });

  it('no longer offers a Data explorer entry anywhere', () => {
    const all = sections.flatMap((s) => s.items);
    expect(
      all.find((i) => i.labelKey === 'navigation.items.dataExplorer'),
    ).toBeUndefined();
    expect(all.find((i) => i.link === '/explorer')).toBeUndefined();
    expect(resources.items.map((i) => i.labelKey)).toEqual([
      'navigation.items.documentation',
      'navigation.items.apiStatus',
    ]);
  });

  it('titles the vehicle pages', () => {
    expect(getPageTitle('/vehicles')).toBe('navigation.pageTitles.vehicles');
    expect(getPageTitle('/vehicles/184223')).toBe('navigation.pageTitles.vehicle');
    expect(getPageTitle('/explorer')).toBeUndefined();
  });

  it("hides owner-only pages from members of someone else's team", () => {
    const item = (
      labelKey: string,
      options: { isMember?: boolean; dataAccessEnabled?: boolean },
    ) =>
      getNavSections(true, options)
        .find((s) => s.labelKey === 'navigation.sections.workspace')!
        .items.find((i) => i.labelKey === labelKey);
    expect(item('navigation.items.webhooks', { isMember: true })?.hidden).toBe(true);
    expect(item('navigation.items.connections', { isMember: true })?.hidden).toBe(true);
    expect(item('navigation.items.webhooks', {})?.hidden).toBeFalsy();
    expect(item('navigation.items.connections', {})?.hidden).toBeFalsy();
  });

  it('shows members Vehicles only while team data access is enabled (C5)', () => {
    const vehicles = (options: { isMember?: boolean; dataAccessEnabled?: boolean }) =>
      getNavSections(true, options)
        .find((s) => s.labelKey === 'navigation.sections.workspace')!
        .items.find((i) => i.labelKey === 'navigation.items.vehicles');
    expect(vehicles({ isMember: true, dataAccessEnabled: false })?.hidden).toBe(true);
    expect(vehicles({ isMember: true, dataAccessEnabled: true })?.hidden).toBeFalsy();
    expect(vehicles({ isMember: false, dataAccessEnabled: false })?.hidden).toBeFalsy();
  });
});
