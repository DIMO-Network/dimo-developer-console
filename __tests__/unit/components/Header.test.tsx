import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';

jest.mock('next/navigation', () => ({
  usePathname: () => '/app',
}));

jest.mock('@/hooks', () => ({
  useGlobalAccount: () => ({
    currentUser: { role: 'OWNER' },
    getCurrentDcxBalance: jest.fn().mockResolvedValue(0),
  }),
  useUser: () => ({ data: { name: 'John Doe' } }),
}));

describe('Header', () => {
  it('renders the user information and credits', () => {
    render(<Header />);

    expect(screen.getByRole('user-information')).toBeInTheDocument();
    expect(screen.getByRole('credits-display')).toBeInTheDocument();
    expect(screen.getByTitle('Account Information')).toBeInTheDocument();
  });
});
