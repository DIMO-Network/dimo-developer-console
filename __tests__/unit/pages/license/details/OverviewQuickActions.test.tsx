import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/hooks/useTeam', () => ({ useTeam: jest.fn() }));
import { useTeam } from '@/hooks/useTeam';
import { OverviewQuickActions } from '@/app/license/[tokenId]/details/components/View/OverviewQuickActions';

describe('OverviewQuickActions', () => {
  it('gives owners every quick action', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: true });
    render(<OverviewQuickActions tokenId={42} onSelectTab={jest.fn()} />);
    for (const label of [
      'Generate API key',
      'Configure branding',
      'Setup vehicle sharing',
      'Docs',
    ]) {
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
    }
  });

  it('leaves members only the docs', () => {
    (useTeam as jest.Mock).mockReturnValue({ isOwner: false });
    render(<OverviewQuickActions tokenId={42} onSelectTab={jest.fn()} />);
    expect(screen.getByText(/Docs/)).toBeInTheDocument();
    expect(screen.queryByText(/Generate API key/)).toBeNull();
    expect(screen.queryByText(/Configure branding/)).toBeNull();
    expect(screen.queryByText(/Setup vehicle sharing/)).toBeNull();
  });
});
