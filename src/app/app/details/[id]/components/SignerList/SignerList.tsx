import { useContext, type FC } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/Button';
import { ContentCopyIcon } from '@/components/Icons';
import { ISigner } from '@/types/app';
import { NotificationContext } from '@/context/notificationContext';
import { Table } from '@/components/Table';
import { deleteMySigner } from '@/actions/app';

interface IProps {
  list: ISigner[] | undefined;
  refreshData: () => void;
}

export const SignerList: FC<IProps> = ({ list = [], refreshData }) => {
  const { setNotification } = useContext(NotificationContext);

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

  const renderDeleteSignerAction = ({ id = '' }: ISigner) => {
    return (
      <button type="button" onClick={() => handleDelete(id)}>
        <TrashIcon className="w-5 h-5" />
      </button>
    );
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMySigner(id);
      refreshData();
    } catch (error: unknown) {
      setNotification(
        'Something wen wrong while deleting the API key',
        'Oops...',
        'error'
      );
    }
  };

  return (
    <>
      {list && list.length > 0 && (
        <Table
          columns={[
            {
              name: 'api_key',
              label: 'API Key',
              render: (item) => renderWithCopy('api_key', item),
            },
          ]}
          data={list.filter(({ deleted }) => !deleted)}
          actions={[renderTestAuthenticationAction, renderDeleteSignerAction]}
        />
      )}
    </>
  );
};

export default SignerList;
