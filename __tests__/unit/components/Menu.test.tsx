import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MenuItem } from '@/components/Menu/MenuItem';

const mockLicenses = jest.fn();
const mockTeam = jest.fn();
jest.mock('@/hooks', () => ({ useHasDeveloperLicenses: () => mockLicenses() }));
jest.mock('@/hooks/useTeam', () => ({ useTeam: () => mockTeam() }));
jest.mock('next/navigation', () => ({
  usePathname: () => '/home',
  useRouter: () => ({ replace: jest.fn() }),
}));
jest.mock('@/components/TeamSwitcher', () => ({ TeamSwitcher: () => null }));
jest.mock('@/hoc', () => ({ withLoadingStatus: (c: unknown) => c }));
jest.mock('@/actions/user', () => ({ signOut: jest.fn() }));
jest.mock('@/config/turnkey', () => ({ turnkeyClient: {} }));
jest.mock('@/hoc/QueryProvider', () => ({ queryClient: { clear: jest.fn() } }));
import { Menu } from '@/components/Menu/Menu';

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
