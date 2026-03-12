import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { user: { name: 'John Doe' } },
  }),
}));

describe('Header', () => {
  it('renders a card', () => {
    render(<Header />);

    const userInformationElm = screen.getByRole('user-information');
    const creditsElm = screen.getByRole('credits-display');

    expect(userInformationElm).toBeInTheDocument();
    expect(creditsElm).toBeInTheDocument();
  });
});
