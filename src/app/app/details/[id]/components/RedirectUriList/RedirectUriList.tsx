import _ from 'lodash';

import { useState, type FC } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';

import { deleteMyRedirectUri, updateMyRedirectUri } from '@/actions/app';
import { IRedirectUri } from '@/types/app';
import { LoadingModal, LoadingProps } from '@/components/LoadingModal';
import { Table } from '@/components/Table';
import { Toggle } from '@/components/Toggle';
import { useContract, useOnboarding } from '@/hooks';

import configuration from '@/config';

interface IProps {
  list: IRedirectUri[] | undefined;
  refreshData: () => void;
}

const ISSUE_IN_DIMO_GAS = 60000;

export const RedirectUriList: FC<IProps> = ({ list = [], refreshData }) => {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
  const { isOnboardingCompleted, workspace } = useOnboarding();
  const { address, dimoLicenseContract } = useContract();

  const recordsToShow = list.filter(({ deleted }) => !deleted);

  const handleSetDomain = async (uri: string, enabled: boolean) => {
    if (!isOnboardingCompleted && !dimoLicenseContract && !workspace)
      throw new Error('Web3 connection failed');
    await dimoLicenseContract?.methods['0xba1bedfc'](
      workspace?.token_id ?? 0,
      enabled,
      uri
    ).send({
      from: address,
      gas: String(ISSUE_IN_DIMO_GAS),
      maxFeePerGas: String(configuration.masFeePerGas),
      maxPriorityFeePerGas: String(configuration.gasPrice),
    });
  };

  const renderToggleStatus = ({ id, uri, status }: IRedirectUri) => {
    return (
      <Toggle
        checked={Boolean(status)}
        onToggle={() => handleUpdateStatus(id as string, uri, !status)}
        key={id}
      />
    );
  };

  const handleUpdateStatus = async (
    id: string,
    uri: string,
    newStatus: boolean
  ) => {
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
      <button
        type="button"
        onClick={() => handleDeleteUri(id as string, uri)}
        key={id}
      >
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
