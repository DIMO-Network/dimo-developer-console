import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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
    render(
      <QueryClientProvider client={new QueryClient()}>
        <Header />
      </QueryClientProvider>,
    );

    expect(screen.getByRole('user-information')).toBeInTheDocument();
    expect(screen.getByRole('credits-display')).toBeInTheDocument();
    expect(screen.getByTitle('Account Information')).toBeInTheDocument();
  });
});
