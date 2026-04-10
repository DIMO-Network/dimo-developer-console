import { FragmentType, gql, useFragment } from '@/gql';
import React, { FC, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { KeyIcon, TruckIcon } from '@heroicons/react/20/solid';
import { Table } from '@/components/Table';
import { TrashIcon } from '@heroicons/react/24/outline';
import { Modal } from '@/components/Modal';
import { SignerFragmentFragment } from '@/gql/graphql';
import * as Sentry from '@sentry/nextjs';
import { get } from 'lodash';
import {
  useDimoAuth,
  useDisableSigner,
  useEnableSigner,
  useEventEmitter,
  useGlobalAccount,
  useMixPanel,
  useSetRedirectUri,
} from '@/hooks';
import { getDevJwt } from '@/utils/devJwt';
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/localStorage';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { APIKeyModal } from '@/app/license/[tokenId]/details/components/Signers/components/APIKeyModal';
import { generateWallet } from '@/utils/wallet';

import { withLoadingStatus } from '@/hoc';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import Column from '@/components/Table/Column';
import { CollapsibleSection } from '@/components/CollapsibleSection';

const FLEETS_DIMO_URL = 'https://fleets.dimo.co/';
const FLEETS_REGISTER_ENDPOINT = 'https://fleets.dimo.co/tenant/register';

const fleetOSSignerKey = (clientId: string) => `fleetOS_signer_${clientId}`;
const getFleetOSSigner = (clientId: string) =>
  getFromLocalStorage<string>(fleetOSSignerKey(clientId));
const saveFleetOSSigner = (clientId: string, address: string) =>
  saveToLocalStorage(fleetOSSignerKey(clientId), address);

const SIGNERS_FRAGMENT = gql(`
  fragment SignerFragment on DeveloperLicense {
    owner
    clientId
    tokenId
    signers(first:100) {
      nodes {
        address
        enabledAt
      }
    }
    redirectURIs(first:100) {
      nodes {
        uri
      }
    }
  }
`);

interface Props {
  license: FragmentType<typeof SIGNERS_FRAGMENT>;
  refetch: () => Promise<void>;
}

type SignerNode = SignerFragmentFragment['signers']['nodes'][0];

const SignersComponent: FC<Props> = ({ license, refetch }) => {
  const { currentUser } = useGlobalAccount();
  const fragment = useFragment(SIGNERS_FRAGMENT, license);
  const [apiKey, setApiKey] = useState<string>();
  const [signerToDelete, setSignerToDelete] = useState<string>();
  const [optimisticAdditions, setOptimisticAdditions] = useState<SignerNode[]>([]);
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(new Set());
  const [showFleetOSConfirm, setShowFleetOSConfirm] = useState(false);
  const [fleetOSSigner, setFleetOSSigner] = useState<string | null>(() =>
    getFleetOSSigner(fragment.clientId),
  );
  const { trackEvent } = useMixPanel();
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const handleDisableSigner = useDisableSigner(fragment.tokenId);
  const handleEnableSigner = useEnableSigner(fragment.tokenId);
  const isLicenseOwner = useIsLicenseOwner(fragment);
  const { publishEvent } = useEventEmitter<{ client_id: `0x${string}` }>(
    'generate-my-developer-jwt',
  );

  const { hasGlobalAccountPrivateKey, getGlobalAccountDeveloperJwt } = useDimoAuth();
  const setFleetRedirectUri = useSetRedirectUri(fragment.tokenId);

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
      setOptimisticAdditions((prev) => [
        ...prev,
        { address: account.address, enabledAt: new Date().toISOString() },
      ]);
      refetch().then(() => setOptimisticAdditions([]));
      trackEvent('API Key Generated', {
        distinct_id: fragment.owner,
        tokenId: fragment.tokenId,
        signerAddress: account.address,
      });
    } catch (error: unknown) {
      handleError(error);
    }
  };

  const handleGenerateFleetOSTenant = async () => {
    let enabledSignerAddress: string | undefined;

    try {
      const hasFleetUri = fragment.redirectURIs.nodes.some(
        (n) => n.uri === FLEETS_DIMO_URL,
      );
      if (!hasFleetUri) {
        setLoadingStatus({
          status: 'loading',
          label: 'Adding FleetOS as an authorized redirect URI...',
        });
        await setFleetRedirectUri(FLEETS_DIMO_URL, true);
      }

      setLoadingStatus({ status: 'loading', label: 'Generating API key for FleetOS...' });
      const account = generateWallet();
      await handleEnableSigner(account.address);
      enabledSignerAddress = account.address;

      setLoadingStatus({ status: 'loading', label: 'Generating developer JWT...' });
      const jwtSuccess = await getGlobalAccountDeveloperJwt({
        clientId: fragment.clientId,
        domain: FLEETS_DIMO_URL,
      });
      if (!jwtSuccess) throw new Error('Failed to generate developer JWT');

      const devJwt = getDevJwt(fragment.clientId);
      if (!devJwt) throw new Error('Failed to retrieve developer JWT');

      setLoadingStatus({ status: 'loading', label: 'Registering FleetOS tenant...' });
      const response = await fetch(FLEETS_REGISTER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${devJwt}`,
        },
        body: JSON.stringify({
          clientId: fragment.clientId,
          redirectUri: FLEETS_DIMO_URL,
          apiKey: account.privateKey,
        }),
      });
      if (!response.ok)
        throw new Error(`FleetOS registration failed: ${response.statusText}`);

      saveFleetOSSigner(fragment.clientId, account.address);
      setFleetOSSigner(account.address);

      clearLoadingStatus();
      setApiKey(account.privateKey);
      setOptimisticAdditions((prev) => [
        ...prev,
        { address: account.address, enabledAt: new Date().toISOString() },
      ]);
      refetch().then(() => setOptimisticAdditions([]));

      trackEvent('FleetOS Tenant Generated', {
        distinct_id: fragment.owner,
        tokenId: fragment.tokenId,
        signerAddress: account.address,
      });
    } catch (error: unknown) {
      if (enabledSignerAddress) {
        await handleDisableSigner(enabledSignerAddress).catch(() => {});
      }
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
      setPendingRemovals((prev) => new Set([...prev, signer]));
      refetch().then(() => setPendingRemovals(new Set()));
      setLoadingStatus({ label: 'API key deleted', status: 'success' });
    } catch (error: unknown) {
      handleError(error);
    }
  };

  const displaySigners = [
    ...fragment.signers.nodes.filter((s) => !pendingRemovals.has(s.address)),
    ...optimisticAdditions.filter(
      (s) => !fragment.signers.nodes.some((n) => n.address === s.address),
    ),
  ];

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

  // Check if current wallet address is listed in the signers
  const isSigner = (owner: `0x${string}`) => {
    return fragment.signers.nodes.some((signer) => signer.address === owner);
  };

  const handleOwnerSigner = async () => {
    try {
      const { hasPrivateKey, privateKeyAddress } = await hasGlobalAccountPrivateKey();
      if (!hasPrivateKey) return;
      if (!isSigner(privateKeyAddress!)) {
        await handleEnableSigner(privateKeyAddress!);
        await refetch();
      }
      publishEvent({ client_id: privateKeyAddress! }, true);
    } catch (error: unknown) {
      handleError(error);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    void handleOwnerSigner();
  }, [currentUser]);

  const onConfirmDelete = () => {
    if (!signerToDelete) {
      throw new Error('No signer to delete');
    }
    void handleDelete(signerToDelete);
    setSignerToDelete(undefined);
  };

  const renderEnabledAt = (item: SignerNode) => {
    const date = new Date(item.enabledAt);
    return date.toLocaleDateString();
  };

  return (
    <CollapsibleSection>
      <CollapsibleSection.Title title={'API Keys'}>
        {isLicenseOwner && (
          <>
            <Button
              className="dark with-icon px-4"
              onClick={() => setShowFleetOSConfirm(true)}
            >
              <TruckIcon className="w-4 h-4" />
              Register FleetOS
            </Button>
            <Button className="dark with-icon px-4" onClick={handleGenerateSigner}>
              <KeyIcon className="w-4 h-4" />
              Generate Key
            </Button>
          </>
        )}
      </CollapsibleSection.Title>
      <CollapsibleSection.Content>
        <div>
          {!!displaySigners.length && (
            <Table
              columns={[
                {
                  name: 'address',
                  label: 'Signer address',
                  CustomHeader: <SignerAddressHeader key="header-addr" />,
                  render: (item: SignerNode) => (
                    <div className="flex items-center gap-2">
                      <span>{item.address}</span>
                      {item.address === fleetOSSigner && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cta-default text-white whitespace-nowrap">
                          FleetOS
                        </span>
                      )}
                    </div>
                  ),
                },
                { name: 'enabledAt', label: 'Enabled on', render: renderEnabledAt },
              ]}
              data={displaySigners}
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
      </CollapsibleSection.Content>
      <APIKeyModal
        isOpen={!!apiKey}
        apiKey={String(apiKey)?.replace('0x', '') ?? ''}
        onClose={() => setApiKey(undefined)}
      />
      <Modal
        isOpen={showFleetOSConfirm}
        setIsOpen={(open) => setShowFleetOSConfirm(open)}
        className="max-w-md"
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">Register FleetOS</h2>
            <p className="text-text-secondary text-sm">
              This will set up your developer license with FleetOS in one step:
            </p>
            <ul className="text-text-secondary text-sm list-disc pl-5 flex flex-col gap-1">
              <li>
                Add <span className="font-mono text-xs">fleets.dimo.co</span> as an
                authorized redirect URI (if not already)
              </li>
              <li>Generate a new API key and register it as a signer</li>
              <li>Register your tenant with the FleetOS API using a developer JWT</li>
            </ul>
            <p className="text-text-secondary text-sm mt-2">
              You will need to approve on-chain transactions. Do not close this window
              once started.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              className="primary flex-1"
              onClick={() => {
                setShowFleetOSConfirm(false);
                void handleGenerateFleetOSTenant();
              }}
            >
              Proceed
            </Button>
            <Button
              className="primary-outline flex-1"
              onClick={() => setShowFleetOSConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </CollapsibleSection>
  );
};

const SignerAddressHeader = () => (
  <Column key={'signer-address-header'}>
    <div>Signer address</div>
    <p className={'max-w-[360px] text-text-secondary text-sm !normal-case'}>
      *This is not your API key. If you have lost your API key, you will need to generate
      a new one.
    </p>
  </Column>
);

export const Signers = withLoadingStatus(SignersComponent);
