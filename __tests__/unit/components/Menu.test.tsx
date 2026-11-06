import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MenuItem } from '@/components/Menu/MenuItem';
import { installFakeBroadcastChannel } from '@/utils/__fixtures__/fakeBroadcastChannel';

const mockLicenses = jest.fn();
const mockTeam = jest.fn();
jest.mock('@/hooks/useHasDeveloperLicenses', () => ({
  useHasDeveloperLicenses: () => mockLicenses(),
}));
jest.mock('@/hooks/useTeam', () => ({ useTeam: () => mockTeam() }));
const replace = jest.fn();
jest.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ replace }),
}));
jest.mock('@/components/TeamSwitcher', () => ({ TeamSwitcher: () => null }));
jest.mock('@/hoc/withLoadingStatus', () => ({
  withLoadingStatus: (c: unknown) => c,
}));
jest.mock('@/actions/user', () => ({ signOut: jest.fn() }));
jest.mock('@/config/turnkey', () => ({
  turnkeyClient: { logout: jest.fn(async () => undefined) },
}));
jest.mock('@/hoc/QueryProvider', () => ({ queryClient: { clear: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import * as Sentry from '@sentry/nextjs';
import { signOut } from '@/actions/user';
import { turnkeyClient } from '@/config/turnkey';
import { queryClient } from '@/hoc/QueryProvider';
import { Menu } from '@/components/Menu/Menu';
import { SESSION_KEY } from '@/utils/globalAccountSession';

const MockIcon = ({ className }: { className: string }) => (
  <span className={className}>Icon</span>
);

describe('MenuItem component', () => {
  it('renders the component with a link', () => {
    render(
      <MenuItem
        link="https://example.com"
        disabled={false}
        external={false}
        iconClassName="test-icon-class"
        label="Test Label"
        icon={MockIcon}
      />,
    );

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', 'https://example.com');
    expect(linkElement).toHaveAttribute('target', '_self');
    expect(linkElement).toHaveTextContent('Test Label');
    expect(screen.getByText('Icon')).toHaveClass('test-icon-class');
  });

  it('renders the component with an external link', () => {
    render(
      <MenuItem
        link="https://example.com"
        disabled={false}
        external={true}
        iconClassName="test-icon-class"
        label="Test Label"
        icon={MockIcon}
      />,
    );

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', 'https://example.com');
    expect(linkElement).toHaveAttribute('target', '_blank');
  });

  it('renders the component with a disabled link', () => {
    render(
      <MenuItem
        link="https://example.com"
        disabled={true}
        external={false}
        iconClassName="test-icon-class"
        label="Test Label"
        icon={MockIcon}
      />,
    );

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', '#');
    expect(linkElement).toHaveAttribute('target', '_self');
    expect(linkElement).toHaveTextContent('Test Label');
    expect(screen.getByText('Icon')).toHaveClass('test-icon-class');
    expect(screen.getByRole('listitem')).toHaveClass('opacity-40');
  });

  it('calls the provided function when clicked', () => {
    const handleClick = jest.fn();

    render(
      <MenuItem
        link={handleClick}
        disabled={false}
        external={false}
        iconClassName="test-icon-class"
        label="Test Label"
        icon={MockIcon}
      />,
    );

    const buttonElement = screen.getByRole('button', { name: 'Test Label' });
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call the provided function when disabled', () => {
    const handleClick = jest.fn();

    render(
      <MenuItem
        link={handleClick}
        disabled={true}
        external={false}
        iconClassName="test-icon-class"
        label="Test Label"
        icon={MockIcon}
      />,
    );

    const listItem = screen.getByRole('listitem');
    expect(listItem).toHaveClass('opacity-40');
    expect(handleClick).not.toHaveBeenCalled();
  });
});

describe('Menu Connections link', () => {
  const renderMenu = () => render(<Menu />);

  beforeEach(() => {
    mockTeam.mockReturnValue({ isMember: false });
  });

  it('keeps Connections when the license count is unknown', () => {
    mockLicenses.mockReturnValue({
      hasDeveloperLicenses: null,
      loading: false,
      error: new Error('x'),
    });
    renderMenu();
    expect(screen.getByRole('link', { name: /Connections/ })).toBeInTheDocument();
  });

  it('hides Connections only for a definite no', () => {
    mockLicenses.mockReturnValue({
      hasDeveloperLicenses: false,
      loading: false,
      error: undefined,
    });
    renderMenu();
    expect(screen.queryByRole('link', { name: /Connections/ })).toBeNull();
  });

  it('hides Connections from a member whatever the count', () => {
    mockTeam.mockReturnValue({ isMember: true });
    mockLicenses.mockReturnValue({
      hasDeveloperLicenses: true,
      loading: false,
      error: undefined,
    });
    renderMenu();
    expect(screen.queryByRole('link', { name: /Connections/ })).toBeNull();
  });
});

describe('Menu Logout', () => {
  let fake: ReturnType<typeof installFakeBroadcastChannel>;
  let other: ReturnType<ReturnType<typeof installFakeBroadcastChannel>['otherTab']>;
  const signedOut = { from: expect.any(String), event: { type: 'signed-out' } };

  // One channel per tab lives in the store module for the whole file.
  beforeAll(() => {
    fake = installFakeBroadcastChannel();
  });
  afterAll(() => fake.restore());
  beforeEach(() => {
    localStorage.clear();
    mockTeam.mockReturnValue({ isMember: false });
    mockLicenses.mockReturnValue({ hasDeveloperLicenses: true, loading: false });
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({
        email: 'a@b.co',
        role: 'owner',
        subOrganizationId: 'sub-1',
        token: 'bundle-1',
        eKey: 'key-1',
        expiry: Math.floor(Date.now() / 1000) + 600,
      }),
    );
    other = fake.otherTab();
  });
  afterEach(() => other.close());

  const logOut = () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole('button', { name: 'Logout' }));
  };

  it('ends the server session, then signs every tab out', async () => {
    (signOut as jest.Mock).mockResolvedValue(true);
    logOut();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(turnkeyClient.logout).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalled();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    await waitFor(() => expect(other.received).toContainEqual(signedOut));
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  // The network, a deploy, or the proxy's 401 for a cookie that no longer
  // verifies: the shared session must not outlive a Logout click.
  it('still signs every tab out when the server action fails', async () => {
    const failure = new Error('unexpected response');
    (signOut as jest.Mock).mockRejectedValue(failure);
    logOut();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    await waitFor(() => expect(other.received).toContainEqual(signedOut));
    expect(turnkeyClient.logout).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalled();
    expect(Sentry.captureException).toHaveBeenCalledWith(failure, expect.anything());
  });

  it("still signs every tab out when Turnkey's logout fails", async () => {
    (signOut as jest.Mock).mockResolvedValue(true);
    (turnkeyClient.logout as jest.Mock).mockRejectedValueOnce(new Error('storage'));
    logOut();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/sign-in'));
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    await waitFor(() => expect(other.received).toContainEqual(signedOut));
  });
});
