import { get } from 'lodash';
import * as Sentry from '@sentry/nextjs';
import React, { useState, type FC, useContext } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Table } from '@/components/Table';
import { useSetRedirectUri } from '@/hooks';
import { Button } from '@/components/Button';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { withLoadingStatus } from '@/hoc';
import { CopyButton } from '@/components/CopyButton';

import '@/components/Button/Button.css';

interface RedirectUri {
  uri: string;
}

interface IProps {
  redirectUris: RedirectUri[] | undefined;
  refreshData: () => void;
  tokenId: number;
  isOwner: boolean;
}

const RedirectUriListComponent: FC<IProps> = ({
  redirectUris = [],
  refreshData,
  tokenId,
  isOwner,
}) => {
  const { setLoadingStatus } = useContext(LoadingStatusContext);
  const [uriToDelete, setUriToDelete] = useState<string>();

  const setRedirectUri = useSetRedirectUri(tokenId);

  const handleError = (error: unknown) => {
    Sentry.captureException(error);
    const code = get(error, 'code', null);
    if (code === 4001)
      setLoadingStatus({
        label: 'The transaction was denied',
        status: 'error',
      });
    else setLoadingStatus({ label: 'Something went wrong', status: 'error' });
  };

  const handleDelete = async (uri: string) => {
    try {
      setLoadingStatus({
        label: 'Deleting the selected redirect URI',
        status: 'loading',
      });
      await setRedirectUri(uri, false);
      setLoadingStatus({ label: 'Redirect URI deleted', status: 'success' });
      refreshData();
    } catch (error: unknown) {
      handleError(error);
    }
  };

  const onConfirmDelete = async () => {
    if (!uriToDelete) {
      throw new Error('No uri to delete');
    }
    await handleDelete(uriToDelete);
    setUriToDelete(undefined);
  };

  const renderCopyRedirectUriAction = ({ uri }: RedirectUri, index: number) => {
    return (
      <CopyButton
        key={`copy-action-${index}`}
        value={uri}
        onCopySuccessMessage={'Redirect URI copied!'}
        className={'button table-action-button'}
      />
    );
  };

  const renderDeleteRedirectUriAction = ({ uri }: RedirectUri, index: number) => {
    return (
      isOwner && (
        <Button
          className={'table-action-button'}
          title="Delete redirect URI"
          type="button"
          onClick={() => setUriToDelete(uri)}
          key={`delete-action-${index}`}
        >
          <TrashIcon className="w-5 h-5 cursor-pointer" />
        </Button>
      )
    );
  };

  return (
    <>
      <Table
        columns={[{ name: 'uri', label: 'Authorized URIs' }]}
        data={redirectUris}
        actions={[renderCopyRedirectUriAction, renderDeleteRedirectUriAction]}
      />
      <DeleteConfirmationModal
        isOpen={!!uriToDelete}
        title={'Are you sure you want to delete this Redirect URI?'}
        subtitle={'You will no longer be able to use this redirect URI in your app.'}
        onConfirm={onConfirmDelete}
        onCancel={() => {
          setUriToDelete(undefined);
        }}
        confirmButtonClassName={'error'}
      />
    </>
  );
};

export const RedirectUriList = withLoadingStatus(RedirectUriListComponent);
