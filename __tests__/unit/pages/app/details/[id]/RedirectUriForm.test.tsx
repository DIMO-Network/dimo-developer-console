import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { RedirectUriForm } from '@/app/app/details/[id]/components/RedirectUriForm';

describe('RedirectUriForm', () => {
  it('renders the redirect uri form on the app details page', () => {
    render(<RedirectUriForm />);

    const signerAddressInputElm = screen.getByRole('redirect-url-input');
    const addUriBtn = screen.getByText('Add URI');

    expect(signerAddressInputElm).toBeInTheDocument();
    expect(addUriBtn).toBeInTheDocument();
  });

  it('renders the redirect uri validation texts', () => {
    render(<RedirectUriForm />);

    const signerAddressInputElm = screen.getByRole('redirect-url-input');

    fireEvent.change(signerAddressInputElm, { target: { value: 'Test' } });
    const invalidTextElm = screen.findByText('Invalid Redirect URI');

    waitFor(() => {
      expect(invalidTextElm).toBeInTheDocument();
    });

    fireEvent.change(signerAddressInputElm, { target: { value: '' } });
    const emptyTextElm = screen.findByText('Please enter the redirect URI');

    waitFor(() => {
      expect(emptyTextElm).toBeInTheDocument();
    });
  });
});
