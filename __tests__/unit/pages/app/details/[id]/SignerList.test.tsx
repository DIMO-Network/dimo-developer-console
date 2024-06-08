import { fireEvent, render, screen } from '@testing-library/react';

import { SignerList } from '@/app/app/details/[id]/components/SignerList';
import { appListMock } from '@/mocks/appList';

const [app] = appListMock;

const writeTextTest = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: writeTextTest,
  },
});

describe('SignerList', () => {
  it('renders the app summary', () => {
    const { container } = render(<SignerList app={app} />);

    const [signer] = app.signers;
    const [walletElm] = screen.getAllByText(signer.wallet);
    const [keyElm] = screen.getAllByText(signer.key);
    const [contentCopyElm] = screen.getAllByRole('content-copy-icon');

    fireEvent.click(contentCopyElm);

    expect(walletElm).toBeInTheDocument();
    expect(keyElm).toBeInTheDocument();
    expect(contentCopyElm).toBeInTheDocument();
    expect(writeTextTest).toHaveBeenCalledWith(signer.key);
    expect(container).toMatchSnapshot();
  });
});
