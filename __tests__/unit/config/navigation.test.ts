import { getNavSections, getPageTitle } from '@/config/navigation';

describe('navigation', () => {
  const sections = getNavSections(true);
  const workspace = sections.find((s) => s.label === 'Workspace')!;
  const resources = sections.find((s) => s.label === 'Resources')!;

  it('lists Vehicles in Workspace right after Licenses', () => {
    const labels = workspace.items.map((i) => i.label);
    expect(labels.indexOf('Vehicles')).toBe(labels.indexOf('Licenses') + 1);
    expect(workspace.items.find((i) => i.label === 'Vehicles')).toMatchObject({
      link: '/vehicles',
      disabled: false,
    });
  });

  it('no longer offers a Data explorer entry anywhere', () => {
    const all = sections.flatMap((s) => s.items);
    expect(all.find((i) => i.label === 'Data explorer')).toBeUndefined();
    expect(all.find((i) => i.link === '/explorer')).toBeUndefined();
    expect(resources.items.map((i) => i.label)).toEqual(['Documentation', 'API status']);
  });

  it('titles the vehicle pages', () => {
    expect(getPageTitle('/vehicles')).toBe('Vehicles');
    expect(getPageTitle('/vehicles/184223')).toBe('Vehicle');
    expect(getPageTitle('/explorer')).toBeUndefined();
  });
});
