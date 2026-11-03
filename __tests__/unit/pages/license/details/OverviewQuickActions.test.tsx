import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
import { OverviewQuickActions } from '@/app/license/[tokenId]/details/components/View/OverviewQuickActions';

describe('OverviewQuickActions', () => {
  it('gives the license owner every quick action', () => {
    render(<OverviewQuickActions tokenId={42} canManage onSelectTab={jest.fn()} />);
    for (const label of [
      'Generate API key',
      'Configure branding',
      'Setup vehicle sharing',
      'Docs',
    ]) {
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
    }
  });

  // Owning your own team doesn't make every license you can open yours.
  it('leaves anyone else only the docs', () => {
    render(
      <OverviewQuickActions tokenId={42} canManage={false} onSelectTab={jest.fn()} />,
    );
    expect(screen.getByText(/Docs/)).toBeInTheDocument();
    expect(screen.queryByText(/Generate API key/)).toBeNull();
    expect(screen.queryByText(/Configure branding/)).toBeNull();
    expect(screen.queryByText(/Setup vehicle sharing/)).toBeNull();
  });
});
