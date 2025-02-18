import _ from 'lodash';
import * as Sentry from '@sentry/nextjs';
import { useState, type FC } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { encodeFunctionData } from 'viem';
import { useSession } from 'next-auth/react';

import { deleteMyRedirectUri, updateMyRedirectUri } from '@/actions/app';
import { IRedirectUri } from '@/types/app';
import { isOwner } from '@/utils/user';
import { LoadingModal, LoadingProps } from '@/components/LoadingModal';
import { Table } from '@/components/Table';
import { Toggle } from '@/components/Toggle';
import { useContractGA, useOnboarding } from '@/hooks';
import { getFromSession, GlobalAccountSession } from '@/utils/sessionStorage';
import { IGlobalAccountSession } from '@/types/wallet';

import configuration from '@/config';
import DimoLicenseABI from '@/contracts/DimoLicenseContract.json';

interface IProps {
  list: IRedirectUri[] | undefined;
  refreshData: () => void;
}

export const RedirectUriList: FC<IProps> = ({ list = [], refreshData }) => {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
  const { workspace } = useOnboarding();
  const { processTransactions } = useContractGA();
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};

  const recordsToShow = list.filter(({ deleted }) => !deleted);

  const handleSetDomain = async (uri: string, enabled: boolean) => {
    const gaSession = getFromSession<IGlobalAccountSession>(GlobalAccountSession);
    const organizationInfo = gaSession?.organization;
    if (!organizationInfo) throw new Error('Web3 connection failed');
    const transaction = [
      {
        to: configuration.DLC_ADDRESS,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: DimoLicenseABI,
          functionName: 'setRedirectUri',
          args: [workspace?.token_id ?? 0, enabled, uri],
        }),
      },
    ];
    await processTransactions(transaction);
  };

  const renderToggleStatus = ({ id, uri, status }: IRedirectUri) => {
    return (
      isOwner(role) && (
        <Toggle
          checked={Boolean(status)}
          onToggle={() => handleUpdateStatus(id as string, uri, !status)}
          key={`toggle-status-action-${id}`}
        />
      )
    );
  };

  const handleUpdateStatus = async (id: string, uri: string, newStatus: boolean) => {
    try {
      setIsOpened(true);
      await handleSetDomain(uri, newStatus);
      setLoadingStatus({
        label: 'Updating the selected redirect URI',
        status: 'loading',
      });
      await updateMyRedirectUri(id, { status: newStatus });
      setLoadingStatus({ label: 'Redirect URI updated', status: 'success' });
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

  const handleDeleteUri = async (id: string, uri: string) => {
    try {
      setIsOpened(true);
      await handleSetDomain(uri, false);
      setLoadingStatus({
        label: 'Deleting the selected redirect URI',
        status: 'loading',
      });
      await deleteMyRedirectUri(id);
      setLoadingStatus({ label: 'Redirect URI deleted', status: 'success' });
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

  const renderDeleteRedirectUriAction = ({ id, uri }: IRedirectUri) => {
    return (
      isOwner(role) && (
        <button
          title="Delete redirect URI"
          type="button"
          onClick={() => handleDeleteUri(id as string, uri)}
          key={`delete-action-${id}`}
        >
          <TrashIcon className="w-5 h-5 cursor-pointer" />
        </button>
      )
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
          <LoadingModal isOpen={isOpened} setIsOpen={setIsOpened} {...loadingStatus} />
        </>
      )}
    </>
  );
};

export default RedirectUriList;
