import { render, screen, waitFor } from '@testing-library/react';

jest.mock('@/hooks', () => ({
  ...jest.requireActual('@/hooks/useCreditTracker'),
  useCreditTracker: jest.requireActual('@/hooks/useCreditTracker').useCreditTracker,
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

const respond = (status: number, body: unknown) =>
  Promise.resolve({ ok: status >= 200 && status < 300, status, json: async () => body });

describe('Usage', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as never;
  });

  it('shows the credits used', async () => {
    fetchMock.mockReturnValue(respond(200, { numOfCreditsUsed: 12 }));
    render(<Usage license={license} />);
    expect(await screen.findByText('12')).toBeInTheDocument();
  });

  // An outage used to read as a license that had used nothing.
  it('says usage is unavailable when the tracker fails', async () => {
    fetchMock.mockReturnValue(respond(502, { message: 'Credit usage unavailable' }));
    render(<Usage license={license} />);
    expect(await screen.findByText('Usage unavailable right now')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('sends the JWT as a header, not in the URL', async () => {
    fetchMock.mockReturnValue(respond(200, { numOfCreditsUsed: 1 }));
    render(<Usage license={license} />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain('jwt');
    expect(init.headers['X-Developer-Jwt']).toBe('dev.jwt');
  });
});
