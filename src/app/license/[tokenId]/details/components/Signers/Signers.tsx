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
import { getFromLocalStorage, saveToLocalStorage } from '@/utils/localStorage';
import { getDeveloperJwt } from '@/services/dimoDev';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { APIKeyModal } from '@/app/license/[tokenId]/details/components/Signers/components/APIKeyModal';
import { generateWallet } from '@/utils/wallet';

import { withLoadingStatus } from '@/hoc';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import Column from '@/components/Table/Column';
import { getUser } from '@/actions/user';
import { FOCUS_RENTALS_OS_SIGNUP, clearFocus, getFocus } from '@/utils/focus';

const RENTAL_OS_URL = 'https://fleets.dimo.co/';
const RENTAL_OS_REGISTER_ENDPOINT = 'https://fleets.dimo.co/tenant/register';

const rentalOSSignerKey = (clientId: string) => `rentalOS_signer_${clientId}`;
const getRentalOSSigner = (clientId: string) =>
  getFromLocalStorage<string>(rentalOSSignerKey(clientId));
const saveRentalOSSigner = (clientId: string, address: string) =>
  saveToLocalStorage(rentalOSSignerKey(clientId), address.toLowerCase());

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
  const [showRentalOSConfirm, setShowRentalOSConfirm] = useState(false);
  const [rentalOSSigner, setRentalOSSigner] = useState<string | null>(() =>
    getRentalOSSigner(fragment.clientId),
  );
  const { trackEvent } = useMixPanel();
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const handleDisableSigner = useDisableSigner(fragment.tokenId);
  const handleEnableSigner = useEnableSigner(fragment.tokenId);
  const isLicenseOwner = useIsLicenseOwner(fragment);
  const { publishEvent } = useEventEmitter<{ client_id: `0x${string}` }>(
    'generate-my-developer-jwt',
  );

  const { hasGlobalAccountPrivateKey } = useDimoAuth();
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

  const handleGenerateRentalOSTenant = async () => {
    let addedRedirectUri = false;
    let enabledSignerAddress: string | undefined;
    let lastError: unknown;

    try {
      const hasFleetUri = fragment.redirectURIs.nodes.some(
        (n) => n.uri === RENTAL_OS_URL,
      );
      if (!hasFleetUri) {
        setLoadingStatus({
          status: 'loading',
          label: 'Adding RentalOS as an authorized redirect URI...',
        });
        await setFleetRedirectUri(RENTAL_OS_URL, true);
        addedRedirectUri = true;
      }

      setLoadingStatus({
        status: 'loading',
        label: 'Generating API key for RentalOS...',
      });
      const account = generateWallet();
      await handleEnableSigner(account.address);
      enabledSignerAddress = account.address;

      // Wait for on-chain state to propagate to the auth servers before
      // requesting a JWT — without this delay the server rejects the request
      // because it hasn't indexed the new signer / redirect URI yet.
      setLoadingStatus({
        status: 'loading',
        label: 'Waiting for on-chain confirmation...',
      });
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Retry JWT generation up to 3 times with 5 s between attempts.
      // Use the newly generated API key (signer private key) to sign the
      // Developer JWT — not the Global Account key.
      const JWT_RETRIES = 3;
      const JWT_RETRY_DELAY_MS = 5000;
      let devJwt: string | null = null;
      for (let attempt = 1; attempt <= JWT_RETRIES; attempt++) {
        setLoadingStatus({
          status: 'loading',
          label:
            attempt === 1
              ? 'Generating developer JWT...'
              : `Generating developer JWT (attempt ${attempt}/${JWT_RETRIES})...`,
        });
        try {
          const result = await getDeveloperJwt({
            client_id: fragment.clientId,
            domain: RENTAL_OS_URL,
            private_key: account.privateKey.replace('0x', ''),
          });
          console.log('[RentalOS] getDeveloperJwt attempt', attempt, 'result:', result);
          if (result?.headers?.Authorization) {
            devJwt = result.headers.Authorization.split(' ')[1];
            break;
          } else {
            console.warn(
              '[RentalOS] getDeveloperJwt attempt',
              attempt,
              '— no Authorization header in response',
            );
          }
        } catch (err) {
          console.error('[RentalOS] getDeveloperJwt attempt', attempt, 'threw:', err);
          lastError = err;
        }
        if (attempt < JWT_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, JWT_RETRY_DELAY_MS));
        }
      }
      if (!devJwt) throw lastError ?? new Error('Failed to generate developer JWT');
      console.log('[RentalOS] Developer JWT obtained, length:', devJwt.length);

      setLoadingStatus({ status: 'loading', label: 'Registering RentalOS tenant...' });
      const user = await getUser();
      if (!user) throw new Error('Failed to retrieve user profile');
      const nameParts = (user.name ?? '').trim().split(/\s+/);
      const firstName = nameParts[0] ?? '';
      const lastName = nameParts.slice(1).join(' ');

      const registrationBody = {
        clientId: fragment.clientId,
        apiKey: account.privateKey.replace('0x', ''),
        wallet: currentUser?.smartContractAddress,
        redirectUri: RENTAL_OS_URL,
        email: user.email,
        ...(firstName && { first_name: firstName }),
        ...(lastName && { last_name: lastName }),
        ...(user.company?.name && { business_name: user.company.name.trim() }),
      };
      console.log('[RentalOS] Registration body (key redacted):', {
        ...registrationBody,
        apiKey: '[redacted]',
      });

      // Retry the registration call up to 3 times in case the auth server is
      // still catching up.
      const REG_RETRIES = 3;
      const REG_RETRY_DELAY_MS = 5000;
      let response: Response | undefined;
      for (let attempt = 1; attempt <= REG_RETRIES; attempt++) {
        if (attempt > 1) {
          setLoadingStatus({
            status: 'loading',
            label: `Registering RentalOS tenant (attempt ${attempt}/${REG_RETRIES})...`,
          });
          await new Promise((resolve) => setTimeout(resolve, REG_RETRY_DELAY_MS));
        }
        try {
          response = await fetch(RENTAL_OS_REGISTER_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${devJwt}`,
            },
            body: JSON.stringify(registrationBody),
          });
          const responseText = await response.text();
          console.log(
            `[RentalOS] /tenant/register attempt ${attempt} — status: ${response.status}, body: ${responseText}`,
          );
          if (response.ok) break;
          lastError = new Error(
            `RentalOS registration failed (${response.status}): ${responseText}`,
          );
        } catch (err) {
          console.error('[RentalOS] /tenant/register attempt', attempt, 'threw:', err);
          lastError = err;
        }
      }
      if (!response?.ok) throw lastError ?? new Error('RentalOS registration failed');

      saveRentalOSSigner(fragment.clientId, account.address);
      setRentalOSSigner(account.address.toLowerCase());

      clearLoadingStatus();
      setApiKey(account.privateKey);
      setOptimisticAdditions((prev) => [
        ...prev,
        { address: account.address, enabledAt: new Date().toISOString() },
      ]);
      refetch().then(() => setOptimisticAdditions([]));

      trackEvent('RentalOS Tenant Generated', {
        distinct_id: fragment.owner,
        tokenId: fragment.tokenId,
        signerAddress: account.address,
      });
    } catch (error: unknown) {
      if (enabledSignerAddress || addedRedirectUri) {
        setLoadingStatus({ status: 'loading', label: 'Rolling back changes...' });
        await Promise.allSettled([
          enabledSignerAddress
            ? handleDisableSigner(enabledSignerAddress)
            : Promise.resolve(),
          addedRedirectUri
            ? setFleetRedirectUri(RENTAL_OS_URL, false)
            : Promise.resolve(),
        ]);
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

  useEffect(() => {
    if (!isLicenseOwner) return;
    if (getFocus() !== FOCUS_RENTALS_OS_SIGNUP) return;
    clearFocus();
    setShowRentalOSConfirm(true);
  }, [isLicenseOwner]);

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
    <div className="p-4 bg-accent border border-border rounded-2xl flex flex-col gap-4 text-foreground">
      <div className="flex flex-col gap-2 md:gap-0 md:flex-row justify-between md:items-center">
        <h2 className="text-xl font-semibold text-foreground">API Keys</h2>
        {isLicenseOwner && (
          <div className="flex gap-2">
            <Button
              className="dark with-icon px-4"
              onClick={() => setShowRentalOSConfirm(true)}
            >
              <TruckIcon className="w-4 h-4" />
              Register RentalOS
            </Button>
            <Button className="dark with-icon px-4" onClick={handleGenerateSigner}>
              <KeyIcon className="w-4 h-4" />
              Generate Key
            </Button>
          </div>
        )}
      </div>
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
                    {item.address.toLowerCase() === rentalOSSigner && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary text-white whitespace-nowrap">
                        RentalOS
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
      <APIKeyModal
        isOpen={!!apiKey}
        apiKey={String(apiKey)?.replace('0x', '') ?? ''}
        onClose={() => setApiKey(undefined)}
      />
      <Modal isOpen={showRentalOSConfirm} setIsOpen={setShowRentalOSConfirm}>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">Register RentalOS</h2>
            <p className="text-text-secondary text-sm">
              Clicking <strong>Proceed</strong> will:
            </p>
            <ul className="text-text-secondary text-sm list-disc pl-5 flex flex-col gap-1">
              <li>Add RentalOS as an authorized redirect URI</li>
              <li>Generate and register a new API key</li>
              <li>Register your tenant with RentalOS</li>
            </ul>
            <p className="text-text-secondary text-sm">
              You&apos;ll need to approve transactions. Don&apos;t close this window once
              started.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              className="primary flex-1"
              onClick={() => {
                setShowRentalOSConfirm(false);
                void handleGenerateRentalOSTenant();
              }}
            >
              Proceed
            </Button>
            <Button
              className="primary-outline flex-1"
              onClick={() => setShowRentalOSConfirm(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
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
