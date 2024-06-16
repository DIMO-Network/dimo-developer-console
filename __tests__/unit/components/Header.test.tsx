import { render, screen } from '@testing-library/react';
import { Header } from '@/components/Header';

describe('Header', () => {
  it('renders a card', () => {
    render(
      <Header
        user={{
          name: 'John Doe',
          email: 'jhondoe@gmail.com',
          auth: 'github',
          auth_login: 'jhondoe@gmail.com',
        }}
      />
    );

    const userInformationElm = screen.getByRole('user-information');
    const creditsElm = screen.getByRole('credits-display');

    expect(userInformationElm).toBeInTheDocument();
    expect(creditsElm).toBeInTheDocument();
  });
});
