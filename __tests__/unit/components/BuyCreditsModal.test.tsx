import { render, screen } from '@testing-library/react';
import { CreditsContext } from '@/context/creditsContext';
import { BuyCreditsModal } from '@/components/BuyCreditsModal/BuyCreditsModal';

jest.mock('@/hooks', () => ({
  useContractGA: () => ({}),
  useGlobalAccount: () => ({ currentUser: null }),
  useUser: () => ({ data: null }),
}));
jest.mock('@/hooks/useSACD', () => ({ useSACD: () => ({}) }));
jest.mock('@/services/token', () => ({ generatePaymentLink: jest.fn() }));
jest.mock('@ethereumjs/util', () => ({ isValidAddress: () => true }));

// The amount toggle (Radix) measures itself.
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('BuyCreditsModal', () => {
  it('states the price and links to pricing in one sentence pair', () => {
    render(
      <CreditsContext.Provider value={{ isOpen: true, setIsOpen: jest.fn() } as never}>
        <BuyCreditsModal />
      </CreditsContext.Provider>,
    );
    expect(
      screen.getByText('The base price to accessing one vehicle is $1.25 per month.'),
    ).toHaveClass('description');
    expect(screen.getByRole('link', { name: 'Learn more.' })).toHaveAttribute(
      'href',
      'https://dimo.org/pricing',
    );
  });
});
