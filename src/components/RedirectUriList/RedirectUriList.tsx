import { useTranslations } from 'next-intl';
import { get } from 'lodash';
import * as Sentry from '@sentry/nextjs';
import React, { useState, type FC, useContext } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Table } from '@/components/Table';
import { useSetRedirectUri } from '@/hooks/useTransactions';
import { Button } from '@/components/Button';
import { DeleteConfirmationModal } from '../DeleteConfirmationModal';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { withLoadingStatus } from '@/hoc/withLoadingStatus';
import { CopyButton } from '@/components/CopyButton';

import '@/components/Button/Button.css';

interface RedirectUri {
  uri: string;
}

interface IProps {
  redirectUris: RedirectUri[] | undefined;
  refreshData: () => Promise<void>;
  tokenId: number;
  isOwner: boolean;
  onRemoved?: (uri: string) => void;
}

const RedirectUriListComponent: FC<IProps> = ({
  redirectUris = [],
  refreshData,
  tokenId,
  isOwner,
  onRemoved,
}) => {
  const t = useTranslations('common');
  const { setLoadingStatus } = useContext(LoadingStatusContext);
  const [uriToDelete, setUriToDelete] = useState<string>();

  const setRedirectUri = useSetRedirectUri(tokenId);

  const handleError = (error: unknown) => {
    Sentry.captureException(error);
    const code = get(error, 'code', null);
    if (code === 4001)
      setLoadingStatus({
        label: t('errors.transactionDenied'),
        status: 'error',
      });
    else setLoadingStatus({ label: t('errors.somethingWentWrong'), status: 'error' });
  };

  const handleDelete = async (uri: string) => {
    try {
      setLoadingStatus({
        label: t('redirectUri.deleting'),
        status: 'loading',
      });
      await setRedirectUri(uri, false);
      if (onRemoved) onRemoved(uri);
      else void refreshData();
      setLoadingStatus({ label: t('redirectUri.deleted'), status: 'success' });
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
        onCopySuccessMessage={t('redirectUri.copied')}
        size="icon"
      />
    );
  };

  const renderDeleteRedirectUriAction = ({ uri }: RedirectUri, index: number) => {
    return (
      isOwner && (
        <Button
          variant="secondary"
          size="icon"
          title={t('redirectUri.deleteTitle')}
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
        columns={[{ name: 'uri', label: t('redirectUri.authorized') }]}
        data={redirectUris}
        actions={[renderCopyRedirectUriAction, renderDeleteRedirectUriAction]}
      />
      <DeleteConfirmationModal
        isOpen={!!uriToDelete}
        title={t('redirectUri.confirmTitle')}
        subtitle={t('redirectUri.confirmSubtitle')}
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
