import { render } from '@testing-library/react';
import { WalletIcon } from '@/components/Icons';

describe('WalletIcon', () => {
  it('renders a wallet icon', () => {
    const { container } = render(<WalletIcon className="w-5 h-6" />);

    const supportIcon = container.querySelector('svg');

    expect(supportIcon).toBeInTheDocument();
  });
});
