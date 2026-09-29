import React from 'react';
import { render, screen } from '@testing-library/react';

// The authorized layout pulls in wallet and session providers; the gate only
// decides what goes inside it, so render children as-is.
jest.mock('@/layouts/AuthorizedLayout', () => ({
  AuthorizedLayout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

type Loaded = {
  Layout: (typeof import('@/app/templates/layout'))['default'];
  getNavSections: (typeof import('@/config/navigation'))['getNavSections'];
};

// The flag is read once at module load, so each case loads fresh modules.
const loadWithFlag = async (enabled: boolean): Promise<Loaded> => {
  let loaded: Loaded | undefined;
  await jest.isolateModulesAsync(async () => {
    jest.doMock('@/utils/featureFlags', () => ({ TEMPLATE_EDITOR_ENABLED: enabled }));
    const layout = await import('@/app/templates/layout');
    const navigation = await import('@/config/navigation');
    loaded = { Layout: layout.default, getNavSections: navigation.getNavSections };
  });
  return loaded!;
};

describe('template editor gate', () => {
  afterEach(() => jest.dontMock('@/utils/featureFlags'));

  it('shows a coming-soon notice instead of the template pages when disabled', async () => {
    const { Layout } = await loadWithFlag(false);
    render(
      <Layout>
        <p>editor page</p>
      </Layout>,
    );
    expect(screen.getByText('Vehicle templates are coming soon')).toBeInTheDocument();
    expect(screen.queryByText('editor page')).not.toBeInTheDocument();
  });

  it('renders the template pages when enabled', async () => {
    const { Layout } = await loadWithFlag(true);
    render(
      <Layout>
        <p>editor page</p>
      </Layout>,
    );
    expect(screen.getByText('editor page')).toBeInTheDocument();
    expect(
      screen.queryByText('Vehicle templates are coming soon'),
    ).not.toBeInTheDocument();
  });

  it.each([
    [false, true],
    [true, false],
  ])(
    'with the flag %s the Templates menu item disabled is %s',
    async (enabled, disabled) => {
      const { getNavSections } = await loadWithFlag(enabled);
      const workspace = getNavSections(true).find((s) => s.label === 'Workspace');
      const item = workspace?.items.find((entry) => entry.label === 'Templates');
      expect(item?.disabled).toBe(disabled);
    },
  );
});
