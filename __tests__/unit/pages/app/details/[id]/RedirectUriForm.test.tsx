import { render, screen } from '@testing-library/react';

import { RedirectUriForm } from '@/app/app/details/[id]/components/RedirectUriForm';

describe('RedirectUriForm', () => {
  it('renders the redirect uri form on the app details page', () => {
    render(<RedirectUriForm />);

    const signerAddressInputElm = screen.getByRole('redirect-url-input');
    const addUriBtn = screen.getByText('Add URI');

    expect(signerAddressInputElm).toBeInTheDocument();
    expect(addUriBtn).toBeInTheDocument();
  });
});
