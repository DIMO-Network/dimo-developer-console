import { fireEvent, render, screen } from '@testing-library/react';

import { RedirectUriList } from '@/components/RedirectUriList';
import { appListMock } from '@/mocks/appList';

jest.mock('@/hooks', () => ({
  useSetRedirectUri: () => jest.fn(),
}));

jest.mock('@/hoc', () => jest.requireActual('@/hoc/withLoadingStatus'));

const [app] = appListMock;

describe('RedirectUriList', () => {
  it('renders the redirect uri list', () => {
    const { container } = render(
      <RedirectUriList
        redirectUris={app.RedirectUris}
        refreshData={async () => {}}
        tokenId={0}
        isOwner={true}
      />,
    );

    const [redirectUri] = app.RedirectUris ?? [];
    const [redirectUriElm] = screen.getAllByText(redirectUri.uri);
    const [deleteElm] = screen.getAllByTitle('Delete redirect URI');

    expect(redirectUriElm).toBeInTheDocument();
    expect(container).toMatchSnapshot();

    fireEvent.click(deleteElm);

    expect(
      screen.getByText('Are you sure you want to delete this Redirect URI?'),
    ).toBeInTheDocument();
  });
});
