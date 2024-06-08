import { fireEvent, render, screen } from '@testing-library/react';

import { RedirectUriList } from '@/app/app/details/[id]/components/RedirectUriList';
import { appListMock } from '@/mocks/appList';

const [app] = appListMock;

describe('RedirectUriList', () => {
  it('renders the redirect uri list', () => {
    const { container } = render(<RedirectUriList app={app} />);

    const [redirectUri] = app.redirectUris;
    const [redirectUriElm] = screen.getAllByText(redirectUri.redirectUri);
    const [toggleElm] = screen.getAllByLabelText('toggle');

    fireEvent.click(toggleElm);

    expect(redirectUriElm).toBeInTheDocument();
    expect(toggleElm).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});
