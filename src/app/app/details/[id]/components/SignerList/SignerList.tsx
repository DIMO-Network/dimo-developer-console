import { useState, type FC } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

import { Button } from '@/components/Button';
import { ContentCopyIcon } from '@/components/Icons';
import { deleteMySigner } from '@/actions/app';
import { ISigner } from '@/types/app';
import { LoadingModal, LoadingProps } from '@/components/LoadingModal';
import { Table } from '@/components/Table';

interface IProps {
  list: ISigner[] | undefined;
  refreshData: () => void;
}

export const SignerList: FC<IProps> = ({ list = [], refreshData }) => {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();

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
      setIsOpened(true);
      setLoadingStatus({
        label: 'Deleting the selected API key',
        status: 'loading',
      });
      await deleteMySigner(id);
      setLoadingStatus({ label: 'API key deleted', status: 'success' });
      refreshData();
    } catch (error: unknown) {
      setLoadingStatus({ label: 'Something went wrong', status: 'error' });
    }
  };

  return (
    <>
      {list && list.length > 0 && (
        <>
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
          <LoadingModal
            isOpen={isOpened}
            setIsOpen={setIsOpened}
            {...loadingStatus}
          />
        </>
      )}
    </>
  );
};

export default SignerList;
