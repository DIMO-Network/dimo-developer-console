import { render, screen } from '@testing-library/react';

import { SignerForm } from '@/app/app/details/[id]/components/SignerForm';

describe('SignerForm', () => {
  it('renders the signer form on the app details page', () => {
    render(<SignerForm />);

    const titleElm = screen.getByText('Add new signer');
    const signerAddressInputElm = screen.getByRole('signer-address-input');
    const generateKeyBtn = screen.getByText('Generate Key');

    expect(titleElm).toBeInTheDocument();
    expect(signerAddressInputElm).toBeInTheDocument();
    expect(generateKeyBtn).toBeInTheDocument();
  });
});
