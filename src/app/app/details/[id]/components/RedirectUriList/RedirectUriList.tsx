import { useState, type FC } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

import { deleteMyRedirectUri, updateMyRedirectUri } from '@/actions/app';
import { IRedirectUri } from '@/types/app';
import { LoadingModal, LoadingProps } from '@/components/LoadingModal';
import { Table } from '@/components/Table';
import { Toggle } from '@/components/Toggle';

interface IProps {
  list: IRedirectUri[] | undefined;
  refreshData: () => void;
}

export const RedirectUriList: FC<IProps> = ({ list = [], refreshData }) => {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();

  const recordsToShow = list.filter(({ deleted }) => !deleted);

  const renderToggleStatus = ({ id, status }: IRedirectUri) => {
    return (
      <Toggle
        checked={Boolean(status)}
        onToggle={() => handleUpdateStatus(id as string, !status)}
      />
    );
  };

  const handleUpdateStatus = async (id: string, newStatus: boolean) => {
    try {
      setIsOpened(true);
      setLoadingStatus({
        label: 'Updating the selected redirect URI',
        status: 'loading',
      });
      await updateMyRedirectUri(id, { status: newStatus });
      setLoadingStatus({ label: 'Redirect URI updated', status: 'success' });
      refreshData();
    } catch (error: unknown) {
      setLoadingStatus({ label: 'Something went wrong', status: 'error' });
    }
  };

  const handleDeleteUri = async (id: string) => {
    try {
      setIsOpened(true);
      setLoadingStatus({
        label: 'Deleting the selected redirect URI',
        status: 'loading',
      });
      await deleteMyRedirectUri(id);
      setLoadingStatus({ label: 'Redirect URI deleted', status: 'success' });
      refreshData();
    } catch (error: unknown) {
      setLoadingStatus({ label: 'Something went wrong', status: 'error' });
    }
  };

  const renderDeleteRedirectUriAction = ({ id }: IRedirectUri) => {
    return (
      <button type="button" onClick={() => handleDeleteUri(id as string)}>
        <TrashIcon className="w-5 h-5 cursor-pointer" />
      </button>
    );
  };

  return (
    <>
      {recordsToShow.length > 0 && (
        <>
          <Table
            columns={[{ name: 'uri' }]}
            data={recordsToShow}
            actions={[renderToggleStatus, renderDeleteRedirectUriAction]}
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

export default RedirectUriList;
