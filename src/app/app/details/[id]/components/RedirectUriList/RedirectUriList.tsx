import { type FC } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

import { IApp } from '@/types/app';
import { Table } from '@/components/Table';
import { Toggle } from '@/components/Toggle';

interface IProps {
  app: IApp;
}

export const RedirectUriList: FC<IProps> = ({ app }) => {
  const renderToggleStatus = (data: Record<string, string>) => {
    const value = data['status'];
    return <Toggle checked={Boolean(value)} />;
  };

  const renderDeleteRedirectUriAction = () => {
    return <TrashIcon className="w-5 h-5" />;
  };
  return (
    <Table
      columns={[{ name: 'redirectUri' }]}
      data={app.redirectUris}
      actions={[renderToggleStatus, renderDeleteRedirectUriAction]}
    />
  );
};

export default RedirectUriList;
