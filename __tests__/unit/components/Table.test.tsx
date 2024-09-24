import { render, screen } from '@testing-library/react';

import { Table } from '@/components/Table';
import { appListMock } from '@/mocks/appList';
import { ContentCopyIcon } from '@/components/Icons';

describe('Table', () => {
  it('renders a table with basic config', () => {
    render(
      <Table
        columns={[
          {
            name: 'name',
          },
        ]}
        data={appListMock.map(({ name }) => ({ name }))}
      />,
    );

    const titleElm = screen.getByText('name');
    const appNameElm = screen.getByText(appListMock[0].name);

    expect(appNameElm).toBeInTheDocument();
    expect(titleElm).toBeInTheDocument();
  });

  it('renders a table with custom render', () => {
    const { container } = render(
      <Table
        columns={[
          {
            name: 'name',
            render: (item: Record<string, string>) => {
              return (
                <p>
                  {item.name ?? ''} - {item.scope ?? ''}
                </p>
              );
            },
          },
          { name: 'names' },
        ]}
        data={appListMock.map(({ name, scope }) => ({ name, scope }))}
      />,
    );

    const appNameElm = screen.getByText(
      `${appListMock[0].name} - ${appListMock[0].scope}`,
    );

    expect(appNameElm).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('renders a table with actions', () => {
    const renderAction = () => (
      <ContentCopyIcon className="2-5 h-5 fill-white" />
    );
    const { container } = render(
      <Table
        columns={[
          {
            name: 'name',
          },
        ]}
        actions={[renderAction]}
        data={appListMock.map(({ name, scope }) => ({ name, scope }))}
      />,
    );

    const actionElms = screen.getAllByRole('content-copy-icon');

    expect(actionElms).toHaveLength(appListMock.length);
    expect(container).toMatchSnapshot();
  });
});
