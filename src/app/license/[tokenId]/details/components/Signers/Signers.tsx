import { FragmentType, gql, useFragment } from '@/gql';
import React, { FC, useContext, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { KeyIcon, TruckIcon } from '@heroicons/react/20/solid';
import { Table } from '@/components/Table';
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
import { toast } from 'sonner';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { markLicenseSignerDisabled, upsertLicenseSigner } from '@/actions/teams';
import { useLicenseSignerRegistry } from '@/hooks/useLicenseSignerRegistry';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { registryWrite } from '@/utils/registryWrite';
import { BelongsTo } from './BelongsTo';
import { KeyHoldersModal, type KeyHolders } from './KeyHoldersModal';
import type { LicenseSignerRecord } from '@/types/team';

const RENTAL_OS_URL = 'https://rentals.dimo.co/';
const RENTAL_OS_REGISTER_ENDPOINT = 'https://rentals.dimo.co/tenant/register';

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
  const registry = useLicenseSignerRegistry(fragment.tokenId);
  const { members } = useTeamMembers();
  // Verified wallets of the team (the owner's console wallet included): console
  // -api refuses them as API_KEY or EXTERNAL keys (C7 SIGNER_IN_USE), so they
  // are never offered for Assign.
  const memberWallets = new Map(
    members
      .filter((m) => m.signerAddress)
      .map((m) => [
        m.signerAddress!.toLowerCase(),
        { name: m.name ?? m.email, email: m.email, owner: m.role === 'OWNER' },
      ]),
  );
  const [holdersFor, setHoldersFor] = useState<
    | { mode: 'generate' }
    | {
        mode: 'assign';
        signer: `0x${string}`;
        kind: 'API_KEY' | 'EXTERNAL';
        initial?: KeyHolders;
      }
    | null
  >(null);

  const toKeyHolders = (record: LicenseSignerRecord): KeyHolders => ({
    holders: record.holders.map((h) =>
      h.userId ? { userId: h.userId } : { name: h.name ?? '' },
    ),
    note: record.note,
  });

  // An unregistered on-chain key is EXTERNAL: assigned after the fact (spec).
  const openAssign = (address: string) => {
    const record = registry.byAddress.get(address.toLowerCase());
    setHoldersFor({
      mode: 'assign',
      signer: address as `0x${string}`,
      kind: record?.kind === 'API_KEY' ? 'API_KEY' : 'EXTERNAL',
      initial: record ? toKeyHolders(record) : undefined,
    });
  };

  // Runs after the key is shown: a failed registry write never hides it.
  const recordKey = async (address: `0x${string}`, value: KeyHolders) => {
    const result = await registryWrite(() =>
      upsertLicenseSigner(fragment.tokenId, address, { kind: 'API_KEY', ...value }),
    );
    void registry.refetch();
    if (!result.ok) {
      toast.error("The key works, but we couldn't record who it's for.", {
        action: {
          label: 'Assign',
          onClick: () =>
            setHoldersFor({
              mode: 'assign',
              signer: address,
              kind: 'API_KEY',
              initial: value,
            }),
        },
      });
    }
  };

  const submitHolders = async (value: KeyHolders): Promise<string | null> => {
    if (!holdersFor) return null;
    if (holdersFor.mode === 'generate') {
      setHoldersFor(null);
      void handleGenerateSigner(value);
      return null;
    }
    const { signer, kind } = holdersFor;
    const result = await registryWrite(() =>
      upsertLicenseSigner(fragment.tokenId, signer, { kind, ...value }),
    );
    if (!result.ok) {
      if (result.code === 'SIGNER_IN_USE')
        return "This address is a team member's wallet. Record it with Grant in Settings → Team.";
      return result.status === 0 || result.status >= 500
        ? "We couldn't save this. Try again."
        : result.message;
    }
    trackEvent('API Key Assigned', {
      tokenId: fragment.tokenId,
      signerAddress: signer,
      holders: value.holders.length,
    });
    toast.success('Saved who this key is for.');
    void registry.refetch();
    setHoldersFor(null);
    return null;
  };

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

  const handleGenerateSigner = async (holders: KeyHolders) => {
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
      // web3's account.address is typed string; it's always 0x-prefixed.
      await recordKey(account.address as `0x${string}`, holders);
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
      // registryWrite never throws, so this can't reach the rollback below.
      await recordKey(account.address as `0x${string}`, {
        holders: [{ name: 'RentalOS' }],
        note: 'RentalOS',
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
      // Stamp the registry row; a key without one answers NOT_FOUND, which is fine.
      await registryWrite(() => markLicenseSignerDisabled(fragment.tokenId, signer));
      void registry.refetch();
      setPendingRemovals((prev) => new Set([...prev, signer]));
      refetch().then(() => setPendingRemovals(new Set()));
      setLoadingStatus({ label: 'API key deleted', status: 'success' });
    } catch (error: unknown) {
      handleError(error);
    }
  };

  type SignerRow = SignerNode & { offChain?: boolean };
  const onChainRows: SignerRow[] = [
    ...fragment.signers.nodes.filter((s) => !pendingRemovals.has(s.address)),
    ...optimisticAdditions.filter(
      (s) => !fragment.signers.nodes.some((n) => n.address === s.address),
    ),
  ];
  const listed = new Set(onChainRows.map((s) => String(s.address).toLowerCase()));
  // Registry rows the chain no longer lists (spec: "Disabled outside the console").
  const offChainRows: SignerRow[] = [...registry.byAddress.values()]
    .filter((r) => !listed.has(r.signerAddress.toLowerCase()))
    .map((r) => ({ address: r.signerAddress, enabledAt: null, offChain: true }));
  const displaySigners = [...onChainRows, ...offChainRows];

  const renderRowActions = (item: SignerRow) => {
    if (!isLicenseOwner || item.offChain) return null;
    // A member's key, or a member's wallet not yet recorded, is granted and
    // revoked in Settings → Team, which keeps the registry in step with the chain.
    const address = String(item.address).toLowerCase();
    const wallet = memberWallets.get(address);
    if (registry.byAddress.get(address)?.kind === 'MEMBER' || (wallet && !wallet.owner))
      return null;
    const remove = {
      label: 'Delete API key',
      destructive: true,
      onSelect: () => setSignerToDelete(item.address),
    };
    return (
      <RowActionsMenu
        key={`actions-${item.address}`}
        label={`Actions for ${item.address}`}
        // The owner's own console wallet can be deleted, never assigned.
        items={
          wallet
            ? [remove]
            : [{ label: 'Assign', onSelect: () => openAssign(item.address) }, remove]
        }
      />
    );
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
    if (!currentUser || !isLicenseOwner) return;
    void handleOwnerSigner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, isLicenseOwner]);

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

  const renderEnabledAt = (item: SignerRow) =>
    item.enabledAt ? new Date(item.enabledAt).toLocaleDateString() : '—';

  return (
    <div className="flex flex-col gap-4 rounded-card bg-card p-4 text-fg">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center md:gap-0">
        <h2 className="text-card-title text-ink">API keys</h2>
        {isLicenseOwner && (
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="px-4"
              onClick={() => setShowRentalOSConfirm(true)}
            >
              <TruckIcon className="h-4 w-4" />
              Register RentalOS
            </Button>
            <Button
              variant="secondary"
              className="px-4"
              onClick={() => setHoldersFor({ mode: 'generate' })}
            >
              <KeyIcon className="h-4 w-4" />
              Generate key
            </Button>
          </div>
        )}
      </div>
      <div>
        {!!displaySigners.length && (
          <div className="-mx-4 -mb-4">
            <Table
              columns={[
                {
                  name: 'address',
                  label: 'Signer address',
                  CustomHeader: <SignerAddressHeader key="header-addr" />,
                  render: (item: SignerRow) => (
                    <div className="flex items-center gap-2">
                      <span className="break-all font-mono text-code">
                        {item.address}
                      </span>
                      {registry.byAddress.get(String(item.address).toLowerCase())
                        ?.note === 'RentalOS' && (
                        <span className="whitespace-nowrap rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
                          RentalOS
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  name: 'enabledAt',
                  label: 'Enabled on',
                  className: 'hidden md:table-cell',
                  render: renderEnabledAt,
                },
                {
                  name: 'belongsTo',
                  label: 'Belongs to',
                  className: 'hidden md:table-cell',
                  render: (item: SignerRow) => (
                    <BelongsTo
                      record={registry.byAddress.get(String(item.address).toLowerCase())}
                      memberWallet={memberWallets.get(String(item.address).toLowerCase())}
                      offChain={item.offChain}
                      unavailable={registry.isError}
                      onAssign={
                        isLicenseOwner &&
                        !memberWallets.has(String(item.address).toLowerCase())
                          ? () => openAssign(item.address)
                          : undefined
                      }
                    />
                  ),
                },
              ]}
              data={displaySigners}
              actions={[renderRowActions]}
            />
          </div>
        )}
      </div>
      {holdersFor && (
        <KeyHoldersModal
          signer={holdersFor.mode === 'assign' ? holdersFor.signer : undefined}
          initial={holdersFor.mode === 'assign' ? holdersFor.initial : undefined}
          submitLabel={holdersFor.mode === 'generate' ? 'Generate API key' : 'Save'}
          onSubmit={submitHolders}
          onClose={() => setHoldersFor(null)}
        />
      )}
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
            <h2 className="text-panel-title text-ink">Register RentalOS</h2>
            <p className="text-body-sm text-muted">
              Clicking <strong>Proceed</strong> will:
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-body-sm text-muted">
              <li>Add RentalOS as an authorized redirect URI</li>
              <li>Generate and register a new API key</li>
              <li>Register your tenant with RentalOS</li>
            </ul>
            <p className="text-body-sm text-muted">
              You&apos;ll need to approve transactions. Don&apos;t close this window once
              started.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={() => {
                setShowRentalOSConfirm(false);
                void handleGenerateRentalOSTenant();
              }}
            >
              Proceed
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
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
    <p className={'max-w-[360px] text-label font-normal text-muted'}>
      *This is not your API key. If you have lost your API key, you will need to generate
      a new one.
    </p>
  </Column>
);

export const Signers = withLoadingStatus(SignersComponent);
