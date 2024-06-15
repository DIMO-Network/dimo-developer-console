import { type FC } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/Button';
import { ContentCopyIcon } from '@/components/Icons';
import { IApp } from '@/types/app';
import { Table } from '@/components/Table';

interface IProps {
  app: IApp;
}

export const SignerList: FC<IProps> = ({ app }) => {
  const handleCopy = (value: string) => {
    void navigator.clipboard.writeText(value);
  };

  const renderWithCopy = (columnName: string, data: Record<string, string>) => {
    const value = data[columnName];
    return (
      <p className="flex flex-row">
        {value}
        <ContentCopyIcon
          className="w-4 h-4 ml-2 fill-white/50 cursor-pointer"
          onClick={() => handleCopy(value)}
        />
      </p>
    );
  };

  const handleTestAuthentication = () => {};

  const renderTestAuthenticationAction = () => {
    return (
      <Button
        className="white-outline px-4"
        onClick={() => handleTestAuthentication()}
      >
        Test Authentication
      </Button>
    );
  };

  const renderDeleteSignerAction = () => {
    return <TrashIcon className="w-5 h-5" />;
  };
  return (
    <Table
      columns={[
        { name: 'wallet' },
        { name: 'key', render: (item) => renderWithCopy('key', item) },
      ]}
      data={app.signers}
      actions={[renderTestAuthenticationAction, renderDeleteSignerAction]}
    />
  );
};

export default SignerList;
