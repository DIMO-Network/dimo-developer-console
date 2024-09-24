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
    const { container } = render(
      <SignerList list={app.Signers} refreshData={() => {}} />,
    );

    const [signer] = app.Signers ?? [];
    const [keyElm] = screen.getAllByText(signer.api_key);
    const [contentCopyElm] = screen.getAllByRole('content-copy-icon');

    fireEvent.click(contentCopyElm);

    expect(keyElm).toBeInTheDocument();
    expect(contentCopyElm).toBeInTheDocument();
    expect(writeTextTest).toHaveBeenCalledWith(signer.api_key);
    expect(container).toMatchSnapshot();
  });
});
