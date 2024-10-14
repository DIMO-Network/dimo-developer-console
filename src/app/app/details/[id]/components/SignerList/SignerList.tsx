import _ from 'lodash';

import { maskStringV2 } from 'maskdata';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useState, type FC } from 'react';

import { Button } from '@/components/Button';
import { changeNetwork } from '@/utils/contract';
import { ContentCopyIcon } from '@/components/Icons';
import { deleteMySigner, testApp } from '@/actions/app';
import { IApp, ISigner } from '@/types/app';
import { LoadingModal, LoadingProps } from '@/components/LoadingModal';
import { Table } from '@/components/Table';
import { TeamRoles } from '@/types/team';
import { useContract, useOnboarding } from '@/hooks';
import { useSession } from 'next-auth/react';

import configuration from '@/config';

interface IProps {
  app: IApp;
  refreshData: () => void;
}

const ISSUE_IN_DIMO_GAS = 60000;

export const SignerList: FC<IProps> = ({ app, refreshData }) => {
  const [isOpened, setIsOpened] = useState<boolean>(false);
  const [loadingStatus, setLoadingStatus] = useState<LoadingProps>();
  const { isOnboardingCompleted, workspace } = useOnboarding();
  const { address, dimoLicenseContract } = useContract();
  const { data: session } = useSession();
  const { user: { role = '' } = {} } = session ?? {};

  const handleCopy = (value: string) => {
    void navigator.clipboard.writeText(value);
  };

  const handleDisableSigner = async (signer: string) => {
    if (!isOnboardingCompleted && !dimoLicenseContract && !workspace)
      throw new Error('Web3 connection failed');
    await changeNetwork();
    await dimoLicenseContract?.methods['0xde9cc84d'](
      workspace?.token_id ?? 0,
      signer,
    ).send({
      from: address,
      gas: String(ISSUE_IN_DIMO_GAS),
      maxFeePerGas: String(configuration.masFeePerGas),
      maxPriorityFeePerGas: String(configuration.gasPrice),
    });
  };

  const renderWithCopy = (columnName: string, data: Record<string, string>) => {
    const value = String(data[columnName]).replace('0x', '');
    return (
      <p className="flex flex-row">
        {maskStringV2(value, {
          maskWith: '*',
          unmaskedEndCharacters: 2,
          unmaskedStartCharacters: 2,
          maxMaskedCharacters: 20,
        })}
        <ContentCopyIcon
          className="w-4 h-4 ml-2 fill-white/50 cursor-pointer"
          onClick={() => handleCopy(value)}
        />
      </p>
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
      setLoadingStatus({ label: 'Something went wrong', status: 'error' });
    }
  };

  const renderTestAuthenticationAction = (signer: ISigner) => {
    return (
      <Button
        className="white-outline px-4"
        onClick={() => handleTestAuthentication(signer)}
        key={signer.id}
      >
        Test Authentication
      </Button>
    );
  };

  const renderDeleteSignerAction = ({
    id = '',
    api_key: signer = '',
  }: ISigner) => {
    return (
      role === TeamRoles.OWNER && (
        <button type="button" onClick={() => handleDelete(id, signer)} key={id}>
          <TrashIcon className="w-5 h-5" />
        </button>
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
                render: (item) => renderWithCopy('api_key', item),
              },
            ]}
            data={app.Signers.filter(({ deleted }) => !deleted)}
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
