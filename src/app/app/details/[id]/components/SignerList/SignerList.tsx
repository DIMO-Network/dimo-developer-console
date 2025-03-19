import _ from 'lodash';

import { maskStringV2 } from 'maskdata';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useState, type FC, useContext } from 'react';
import { encodeFunctionData } from 'viem';

import { Button } from '@/components/Button';
import { ContentCopyIcon } from '@/components/Icons';
import { deleteMySigner, testApp } from '@/actions/app';
import { IApp, ISigner } from '@/types/app';
import { isOwner } from '@/utils/user';
import { LoadingModal, LoadingProps } from '@/components/LoadingModal';
import { Table } from '@/components/Table';
import { useContractGA, useGlobalAccount, useOnboarding } from '@/hooks';

import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';
import configuration from '@/config';
import * as Sentry from '@sentry/nextjs';
import { NotificationContext } from '@/context/notificationContext';

interface IProps {
  app: IApp;
  refreshData: () => void;
}

export const SignerList: FC<IProps> = ({ app, refreshData }) => {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
  const { workspace } = useOnboarding();
  const { processTransactions } = useContractGA();
  const { currentUser, validateCurrentSession } = useGlobalAccount();
  const { setNotification } = useContext(NotificationContext);

  const handleCopy = (value: string) => {
    void navigator.clipboard.writeText(value);
    setNotification('API Key copied', 'Success!', 'info');
  };

  const handleDisableSigner = async (signer: string) => {
    const currentSession = await validateCurrentSession();
    if (!currentSession && !workspace) throw new Error('Web3 connection failed');
    const transaction = [
      {
        to: configuration.DLC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoLicenseABI,
          functionName: 'disableSigner',
          args: [workspace?.token_id ?? 0, signer],
        }),
      },
    ];
    await processTransactions(transaction);
  };

  const renderColumn = (columnName: string, data: ISigner) => {
    const value = String(data[columnName]).replace('0x', '');
    return (
      <div
        className={
          'bg-surface-raised rounded-xl px-3 py-2 inline-flex flex-row items-center gap-2.5'
        }
      >
        <p className="text-base text-text-secondary">
          {maskStringV2(value, {
            maskWith: '*',
            unmaskedEndCharacters: 2,
            unmaskedStartCharacters: 2,
            maxMaskedCharacters: 20,
          })}
        </p>
        <ContentCopyIcon
          className="w-4 h-4 fill-text-secondary cursor-pointer"
          onClick={() => handleCopy(value)}
        />
      </div>
    );
  };

  const handleTestAuthentication = async (signer: ISigner) => {
    try {
      setIsOpened(true);
      setLoadingStatus({
        label: 'Testing the application',
        status: 'loading',
      });
      const { uri: domain = '' } =
        app.RedirectUris?.find(({ deleted }) => !deleted) || {};
      if (!domain) {
        return setLoadingStatus({
          label: 'You need to set at least one domain',
          status: 'error',
        });
      }
      await testApp(app, signer);
      setLoadingStatus({
        label: 'Application tested successfully',
        status: 'success',
      });
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error(error);
      setLoadingStatus({ label: 'Something went wrong', status: 'error' });
    }
  };

  const renderTestAuthenticationAction = (signer: ISigner) => {
    return (
      <Button
        className="table-action-button"
        onClick={() => handleTestAuthentication(signer)}
        key={`test-action-${signer.id}`}
      >
        Test Authentication
      </Button>
    );
  };

  const renderDeleteSignerAction = ({ id = '', address: signer = '' }: ISigner) => {
    const { role } = currentUser!;
    return (
      isOwner(role) && (
        <Button
          className={'table-action-button'}
          title="Delete API key"
          type="button"
          onClick={() => handleDelete(id, signer)}
          key={`delete-action-${id}`}
        >
          <TrashIcon className="w-5 h-5" />
        </Button>
      )
    );
  };

  const handleDelete = async (id: string, signer: string) => {
    try {
      setIsOpened(true);
      await handleDisableSigner(signer);
      setLoadingStatus({
        label: 'Deleting the selected API key',
        status: 'loading',
      });
      await deleteMySigner(id);
      setLoadingStatus({ label: 'API key deleted', status: 'success' });
      refreshData();
    } catch (error: unknown) {
      Sentry.captureException(error);
      const code = _.get(error, 'code', null);
      if (code === 4001)
        setLoadingStatus({
          label: 'The transaction was denied',
          status: 'error',
        });
      else setLoadingStatus({ label: 'Something went wrong', status: 'error' });
    }
  };

  return (
    <>
      {app.Signers && app.Signers.length > 0 && (
        <>
          <Table
            columns={[
              {
                name: 'api_key',
                label: 'API Key',
                render: (item: ISigner) => renderColumn('api_key', item),
              },
            ]}
            data={app.Signers.filter(({ deleted }) => !deleted)}
            actions={[renderTestAuthenticationAction, renderDeleteSignerAction]}
          />
          <LoadingModal isOpen={isOpened} setIsOpen={setIsOpened} {...loadingStatus} />
        </>
      )}
    </>
  );
};

export default SignerList;
