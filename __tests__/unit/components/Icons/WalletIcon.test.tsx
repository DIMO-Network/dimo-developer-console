import { render, screen } from '@testing-library/react';
import { WalletIcon } from '@/components/Icons';

describe('WalletIcon', () => {
  it('renders a wallet icon', () => {
    render(<WalletIcon className="w-5 h-6" />);

    const supportIcon = screen.getByRole('wallet-icon');

    expect(supportIcon).toBeInTheDocument();
  });
});
