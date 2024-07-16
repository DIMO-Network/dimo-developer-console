import { fireEvent, render, screen } from '@testing-library/react';

import { AppSummary } from '@/app/app/details/[id]/components/AppSummary';
import { appListMock } from '@/mocks/appList';

const [app] = appListMock;

const writeTextTest = jest.fn();
Object.assign(navigator, {
  clipboard: {
    writeText: writeTextTest,
  },
});

describe('AppSummary', () => {
  it('renders the app summary', () => {
    render(<AppSummary app={app} />);

    const appNameElm = screen.getByText(app.name);
    const scopeElm = screen.getByText(app.scope);
    const contentCopyElm = screen.getByRole('content-copy-icon');

    fireEvent.click(contentCopyElm);

    expect(appNameElm).toBeInTheDocument();
    expect(scopeElm).toBeInTheDocument();
    expect(writeTextTest).toHaveBeenCalledWith(app.Workspace.client_id);
  });
});
