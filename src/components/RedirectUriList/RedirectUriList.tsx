import { get } from 'lodash';
import * as Sentry from '@sentry/nextjs';
import { useState, type FC, useContext } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { IRedirectUri } from '@/types/app';
import { LoadingModal, LoadingProps } from '@/components/LoadingModal';
import { Table } from '@/components/Table';
import { useSetRedirectUri } from '@/hooks';
import { Button } from '@/components/Button';
import { ContentCopyIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';

interface RedirectUri {
  uri: string;
}

interface IProps {
  redirectUris: RedirectUri[] | undefined;
  refreshData: () => void;
  tokenId: number;
  isOwner: boolean;
}

export const RedirectUriList: FC<IProps> = ({
  redirectUris = [],
  refreshData,
  tokenId,
  isOwner,
}) => {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
  const { setNotification } = useContext(NotificationContext);

  const setRedirectUri = useSetRedirectUri(tokenId);

  const handleDelete = async (uri: string) => {
    try {
      setIsOpened(true);
      await setRedirectUri(uri, false);
      setLoadingStatus({
        label: 'Deleting the selected redirect URI',
        status: 'loading',
      });
      setLoadingStatus({ label: 'Redirect URI deleted', status: 'success' });
      refreshData();
    } catch (error: unknown) {
      Sentry.captureException(error);
      const code = get(error, 'code', null);
      if (code === 4001)
        setLoadingStatus({
          label: 'The transaction was denied',
          status: 'error',
        });
      else setLoadingStatus({ label: 'Something went wrong', status: 'error' });
    }
  };

  const handleCopy = (value: string) => {
    void navigator.clipboard.writeText(value);
    setNotification('Redirect URI copied!', 'Success', 'info');
  };

  const renderCopyRedirectUriAction = ({ id, uri }: IRedirectUri) => {
    return (
      <Button
        className={'table-action-button'}
        title="Copy Redirect URI"
        key={`copy-redirect-uri-action-${id}`}
        type={'button'}
        onClick={() => handleCopy(uri)}
      >
        <ContentCopyIcon className="w-4 h-4 fill-text-secondary cursor-pointer" />
      </Button>
    );
  };

  const renderDeleteRedirectUriAction = ({ uri }: RedirectUri, index: number) => {
    return (
      isOwner && (
        <Button
          className={'table-action-button'}
          title="Delete redirect URI"
          type="button"
          onClick={() => handleDelete(uri)}
          key={`delete-action-${uri}-${index}`}
        >
          <TrashIcon className="w-5 h-5 cursor-pointer" />
        </Button>
      )
    );
  };

  return (
    <>
      {!!redirectUris.length && (
        <>
          <Table
            columns={[{ name: 'uri', label: 'Authorized URIs' }]}
            // @ts-expect-error not sure
            data={redirectUris}
            actions={[renderCopyRedirectUriAction, renderDeleteRedirectUriAction]}
          />
          <LoadingModal isOpen={isOpened} setIsOpen={setIsOpened} {...loadingStatus} />
        </>
      )}
    </>
  );
};

export default RedirectUriList;
