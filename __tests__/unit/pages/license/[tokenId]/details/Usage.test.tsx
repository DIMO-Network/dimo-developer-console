import { render, screen, waitFor } from '@testing-library/react';

const mockUsage = jest.fn();
jest.mock('@/hooks', () => ({
  useCreditTracker: () => ({ getUsageByLicense: mockUsage }),
  useEventEmitter: () => ({ eventData: null }),
}));
jest.mock('@/hooks/useGetDevJwts', () => ({
  useGetDevJwts: () => ({
    isAuthenticatedAsDev: true,
    devJwts: [{ token: 'dev.jwt' }],
    refetch: jest.fn(),
  }),
}));
jest.mock('@/gql', () => ({
  gql: (s: TemplateStringsArray) => s,
  useFragment: (_def: unknown, data: unknown) => data,
}));
jest.mock('@/components/LicenseCard', () => ({
  DEVELOPER_LICENSE_SUMMARY_FRAGMENT: 'fragment',
}));
import { Usage } from '@/app/license/[tokenId]/details/components/Usage/Usage';

const license = { clientId: '0xabc' } as never;

describe('Usage', () => {
  it('shows the credits the license used', async () => {
    mockUsage.mockResolvedValue({ numOfCreditsUsed: 42 });
    render(<Usage license={license} />);
    expect(await screen.findByText('42')).toBeInTheDocument();
  });

  // An outage used to read as a license that had used nothing.
  it('does not show 0 when usage could not be loaded', async () => {
    mockUsage.mockRejectedValue(new Error('credit tracker is down'));
    render(<Usage license={license} />);
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument());
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
