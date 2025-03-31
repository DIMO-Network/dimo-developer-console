import { FragmentType, gql, useFragment } from '@/gql';
import React, { FC, useContext, useState } from 'react';
import { Button } from '@/components/Button';
import { KeyIcon } from '@heroicons/react/20/solid';
import { Table } from '@/components/Table';
import { TrashIcon } from '@heroicons/react/24/outline';
import { SignerFragmentFragment } from '@/gql/graphql';
import * as Sentry from '@sentry/nextjs';
import { get } from 'lodash';
import { useDisableSigner, useEnableSigner } from '@/hooks';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { APIKeyModal } from '@/app/license/details/[tokenId]/components/Signers/components/APIKeyModal';
import { generateWallet } from '@/utils/wallet';
import { Section, SectionHeader } from '@/app/license/components/Section';

import { withLoadingStatus } from '@/hoc';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';

const SIGNERS_FRAGMENT = gql(`
  fragment SignerFragment on DeveloperLicense {
    owner
    tokenId
    signers(first:100) {
      nodes {
        address
        enabledAt
      }
    }
  }
`);

interface Props {
  license: FragmentType<typeof SIGNERS_FRAGMENT>;
  refetch: () => void;
}

type SignerNode = SignerFragmentFragment['signers']['nodes'][0];

const SignersComponent: FC<Props> = ({ license, refetch }) => {
  const [apiKey, setApiKey] = useState<string>();
  const [signerToDelete, setSignerToDelete] = useState<string>();
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const fragment = useFragment(SIGNERS_FRAGMENT, license);
  const handleDisableSigner = useDisableSigner(fragment.tokenId);
  const handleEnableSigner = useEnableSigner(fragment.tokenId);
  const isLicenseOwner = useIsLicenseOwner(fragment);

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

  const handleGenerateSigner = async () => {
    try {
      setLoadingStatus({
        status: 'loading',
        label: 'Generating an API key for your developer license',
      });
      const account = generateWallet();
      await handleEnableSigner(account.address);
      clearLoadingStatus();
      setApiKey(account.privateKey);
      await refetch();
    } catch (error: unknown) {
      handleError(error);
    }
  };

  const handleDelete = async (signer: string) => {
    try {
      setLoadingStatus({
        label: 'Deleting the selected API key',
        status: 'loading',
      });
      await handleDisableSigner(signer);
      setLoadingStatus({ label: 'API key deleted', status: 'success' });
      refetch();
    } catch (error: unknown) {
      handleError(error);
    }
  };

  const renderDeleteSignerAction = (item: SignerNode, index: number) => {
    if (isLicenseOwner) {
      return (
        <Button
          className={'table-action-button'}
          title="Delete API key"
          type="button"
          onClick={() => {
            setSignerToDelete(item.address);
          }}
          key={`delete-action-${index}`}
        >
          <TrashIcon className="w-5 h-5" />
        </Button>
      );
    }
  };

  const onConfirmDelete = () => {
    if (!signerToDelete) {
      throw new Error('No signer to delete');
    }
    handleDelete(signerToDelete);
    setSignerToDelete(undefined);
  };

  const renderEnabledAt = (item: SignerNode) => {
    const date = new Date(item.enabledAt);
    return date.toLocaleDateString();
  };

  return (
    <Section>
      <SectionHeader title={'API Keys'}>
        {isLicenseOwner && (
          <Button
            className="dark with-icon px-4"
            loadingColor="primary"
            onClick={handleGenerateSigner}
          >
            <KeyIcon className="w-4 h-4" />
            Generate Key
          </Button>
        )}
      </SectionHeader>
      <div>
        {!!fragment.signers.nodes.length && (
          <Table
            columns={[
              { name: 'address', label: 'Signer address' },
              { name: 'enabledAt', label: 'Enabled on', render: renderEnabledAt },
            ]}
            data={fragment.signers.nodes}
            actions={[renderDeleteSignerAction]}
          />
        )}
      </div>
      <DeleteConfirmationModal
        isOpen={!!signerToDelete}
        title={'Are you sure you want to delete this API key?'}
        subtitle={'You will no longer be able to use this key in your app.'}
        onConfirm={onConfirmDelete}
        onCancel={() => {
          setSignerToDelete(undefined);
        }}
        confirmButtonClassName={'error'}
      />
      <APIKeyModal
        isOpen={!!apiKey}
        apiKey={String(apiKey)?.replace('0x', '') ?? ''}
        onClose={() => setApiKey(undefined)}
      />
    </Section>
  );
};

export const Signers = withLoadingStatus(SignersComponent);
