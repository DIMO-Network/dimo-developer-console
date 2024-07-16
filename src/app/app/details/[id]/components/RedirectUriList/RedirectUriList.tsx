import { useContext, type FC } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

import { IRedirectUri } from '@/types/app';
import { Table } from '@/components/Table';
import { Toggle } from '@/components/Toggle';
import { deleteMyRedirectUri, updateMyRedirectUri } from '@/actions/app';
import { NotificationContext } from '@/context/notificationContext';

interface IProps {
  list: IRedirectUri[] | undefined;
  refreshData: () => void;
}

export const RedirectUriList: FC<IProps> = ({ list = [], refreshData }) => {
  const { setNotification } = useContext(NotificationContext);

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
      await updateMyRedirectUri(id, { status: newStatus });
      refreshData();
    } catch (error: unknown) {
      setNotification(
        'Something wen wrong while deleting the redirect URI',
        'Oops...',
        'error'
      );
    }
  };

  const handleDeleteUri = async (id: string) => {
    try {
      await deleteMyRedirectUri(id);
      refreshData();
    } catch (error: unknown) {
      setNotification(
        'Something wen wrong while deleting the redirect URI',
        'Oops...',
        'error'
      );
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
    <Table
      columns={[{ name: 'uri' }]}
      data={list.filter(({ deleted }) => !deleted)}
      actions={[renderToggleStatus, renderDeleteRedirectUriAction]}
    />
  );
};

export default RedirectUriList;
