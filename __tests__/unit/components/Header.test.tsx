import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';

describe('Header', () => {
  it('renders a card', () => {
    render(
      <Header />
    );

    const userInformationElm = screen.getByRole('user-information');
    const creditsElm = screen.getByRole('credits-display');

    expect(userInformationElm).toBeInTheDocument();
    expect(creditsElm).toBeInTheDocument();
  });
});
