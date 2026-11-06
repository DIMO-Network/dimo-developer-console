import { FragmentType, gql, useFragment } from '@/gql';
import React, { FC, useContext, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/Button';
import { KeyIcon } from '@heroicons/react/20/solid';
import { Table } from '@/components/Table';
import { SignerFragmentFragment } from '@/gql/graphql';
import * as Sentry from '@sentry/nextjs';
import { get } from 'lodash';
import { useDimoAuth } from '@/hooks/useDimoAuth';
import { useDisableSigner, useEnableSigner } from '@/hooks/useTransactions';
import { useEventEmitter } from '@/hooks/useEventEmitter';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { useMixPanel } from '@/hooks/useMixPanel';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { APIKeyModal } from '@/app/license/[tokenId]/details/components/Signers/components/APIKeyModal';
import { generateWallet } from '@/utils/wallet';

import { withLoadingStatus } from '@/hoc/withLoadingStatus';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { useIsLicenseOwner } from '@/hooks/useIsLicenseOwner';
import Column from '@/components/Table/Column';
import { toast } from 'sonner';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { markLicenseSignerDisabled, upsertLicenseSigner } from '@/actions/teams';
import { useLicenseSignerRegistry } from '@/hooks/useLicenseSignerRegistry';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { registryWrite } from '@/utils/registryWrite';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { BelongsTo } from './BelongsTo';
import { ConsoleAccess } from './ConsoleAccess';
import {
  API_KEY_BUTTON,
  API_KEY_EXPLAINER,
  CONSOLE_KEY_NOTE,
  NOT_LICENSE_OWNER_ON_CHAIN,
  TURN_OFF_CONSOLE_ACCESS,
  isConsoleAccessOn,
} from './consoleAccessCopy';
import { KeyHoldersModal, type KeyHolders } from './KeyHoldersModal';
import type { LicenseSignerRecord } from '@/types/team';
import { useRedirectUris } from '../redirectUriOverlay';

const DELETE_KEY_SUBTITLE =
  'Apps using this key stop getting new developer JWTs. JWTs already issued with it keep working until they expire, up to 14 days.';
const CONSOLE_OFF_SUBTITLE =
  'The console stops making developer JWTs for this license. JWTs it already made keep working until they expire, up to 14 days.';
// Registry rows are written only after the chain confirms, so a row this new
// that Identity doesn't list yet is Identity catching up, not a key turned off.
const SYNCING_MS = 10 * 60_000;

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
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [optimisticAdditions, setOptimisticAdditions] = useState<SignerNode[]>([]);
  const [pendingRemovals, setPendingRemovals] = useState<Set<string>>(new Set());
  const { trackEvent } = useMixPanel();
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const handleDisableSigner = useDisableSigner(fragment.tokenId);
  const handleEnableSigner = useEnableSigner(fragment.tokenId);
  const isLicenseOwner = useIsLicenseOwner(fragment);
  const { publishEvent } = useEventEmitter<{ client_id: `0x${string}` }>(
    'generate-my-developer-jwt',
  );

  const { hasGlobalAccountPrivateKey, findConsoleKeyAddress } = useDimoAuth();
  const queryClient = useQueryClient();
  const [enabling, setEnabling] = useState(false);
  const [enableError, setEnableError] = useState<string | null>(null);
  const consoleKeyRecorded = useRef(false);
  const consoleKeyAnnounced = useRef(false);
  // The key we just enabled, shown as on until Identity lists it (one enable per mount).
  const [enabledKey, setEnabledKey] = useState<string | null>(null);
  // Read-only Turnkey lookup (never creates a key); members never run it.
  const consoleKeyQuery = useQuery({
    queryKey: ['console-key', currentUser?.subOrganizationId],
    queryFn: findConsoleKeyAddress,
    enabled: isLicenseOwner && !!currentUser,
    retry: false,
  });
  const consoleKey = (consoleKeyQuery.data ?? enabledKey)?.toLowerCase() ?? null;
  const { uris: redirectUris } = useRedirectUris(fragment.redirectURIs.nodes);
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
      // The row stays until Identity lists the key: one refetch is often too soon.
      void refetch().catch((error: unknown) => Sentry.captureException(error));
      trackEvent('API Key Generated', {
        distinct_id: fragment.owner,
        tokenId: fragment.tokenId,
        signerAddress: account.address,
      });
      await recordKey(account.address, holders);
    } catch (error: unknown) {
      handleError(error);
    }
  };

  const handleDelete = async (signer: string) => {
    const turningOff = signer.toLowerCase() === consoleKey;
    // The dialog closes once the transaction confirms; the registry stamp and
    // the license refetch finish behind the page.
    await handleDisableSigner(signer);
    if (turningOff) setEnabledKey(null);
    setOptimisticAdditions((prev) =>
      prev.filter((s) => s.address.toLowerCase() !== signer.toLowerCase()),
    );
    setPendingRemovals((prev) => new Set([...prev, signer.toLowerCase()]));
    toast.success(
      turningOff
        ? 'Console access turned off.'
        : 'API key deleted. JWTs already issued with it work until they expire (up to 14 days).',
    );
    void (async () => {
      try {
        // A key without a registry row answers NOT_FOUND, which is fine.
        await registryWrite(() => markLicenseSignerDisabled(fragment.tokenId, signer));
      } catch (error: unknown) {
        Sentry.captureException(error);
      }
      void registry.refetch();
    })();
    // A failed refetch leaves the address pending; the effect below clears it
    // once the license stops listing it.
    void refetch().catch((error: unknown) => Sentry.captureException(error));
  };

  useEffect(() => {
    setPendingRemovals((prev) => {
      if (!prev.size) return prev;
      const listed = new Set(fragment.signers.nodes.map((n) => n.address.toLowerCase()));
      const next = new Set([...prev].filter((a) => listed.has(a)));
      return next.size === prev.size ? prev : next;
    });
  }, [fragment.signers.nodes]);

  type SignerRow = SignerNode & { offChain?: boolean; syncing?: boolean };
  const onChainRows: SignerRow[] = [
    ...fragment.signers.nodes.filter(
      (s) => !pendingRemovals.has(s.address.toLowerCase()),
    ),
    ...optimisticAdditions.filter(
      (s) =>
        !fragment.signers.nodes.some(
          (n) => n.address.toLowerCase() === s.address.toLowerCase(),
        ),
    ),
  ];
  if (
    enabledKey &&
    !pendingRemovals.has(enabledKey.toLowerCase()) &&
    !onChainRows.some((r) => String(r.address).toLowerCase() === enabledKey.toLowerCase())
  )
    onChainRows.push({ address: enabledKey, enabledAt: new Date().toISOString() });
  const listed = new Set(onChainRows.map((s) => String(s.address).toLowerCase()));
  // Registry rows the chain no longer lists (spec: "Disabled outside the console"),
  // unless the row is new enough that Identity may simply not have indexed it yet.
  const now = Date.now();
  const offChainRows: SignerRow[] = [...registry.byAddress.values()]
    .filter((r) => !listed.has(r.signerAddress.toLowerCase()))
    .map((r) => ({
      address: r.signerAddress,
      enabledAt: null,
      offChain: true,
      syncing: now - Date.parse(r.createdAt) < SYNCING_MS,
    }));
  const displaySigners = [...onChainRows, ...offChainRows];

  const renderRowActions = (item: SignerRow) => {
    if (!isLicenseOwner || item.offChain) return null;
    // A member's key, or a member's wallet not yet recorded, is granted and
    // revoked in Settings → Team, which keeps the registry in step with the chain.
    const address = String(item.address).toLowerCase();
    const wallet = memberWallets.get(address);
    if (
      address !== consoleKey &&
      (registry.byAddress.get(address)?.kind === 'MEMBER' || (wallet && !wallet.owner))
    )
      return null;
    const isConsoleKey = address === consoleKey;
    const remove = {
      label: isConsoleKey ? TURN_OFF_CONSOLE_ACCESS : 'Delete API key',
      destructive: true,
      onSelect: () => {
        setDeleteError(null);
        setSignerToDelete(item.address);
      },
    };
    return (
      <RowActionsMenu
        key={`actions-${item.address}`}
        label={`Actions for ${item.address}`}
        // The owner's own console wallet can be deleted, never assigned.
        items={
          isConsoleKey
            ? [remove]
            : wallet
              ? [remove]
              : [{ label: 'Assign', onSelect: () => openAssign(item.address) }, remove]
        }
      />
    );
  };

  // Check if current wallet address is listed in the signers. onChainRows, not the
  // fragment: a key just turned off is still listed until Identity catches up, and
  // enabling it then needs the transaction.
  const isSigner = (owner: `0x${string}`) => {
    return onChainRows.some(
      (signer) => String(signer.address).toLowerCase() === owner.toLowerCase(),
    );
  };

  const ownerUserId = members.find((m) => m.role === 'OWNER')?.userId;

  // A console-api write, not a transaction; a failure is ignored like recordKey's.
  const recordConsoleKey = async (address: `0x${string}`) => {
    if (!ownerUserId) return;
    await registryWrite(() =>
      upsertLicenseSigner(fragment.tokenId, address, {
        kind: 'API_KEY',
        note: CONSOLE_KEY_NOTE,
        holders: [{ userId: ownerUserId }],
      }),
    );
    void registry.refetch();
  };

  const enableConsoleAccess = async () => {
    setEnabling(true);
    setEnableError(null);
    try {
      if (
        !currentUser?.smartContractAddress ||
        fragment.owner.toLowerCase() !== currentUser.smartContractAddress.toLowerCase()
      ) {
        setEnableError(NOT_LICENSE_OWNER_ON_CHAIN);
        return;
      }
      const { hasPrivateKey, privateKeyAddress } = await hasGlobalAccountPrivateKey();
      if (!hasPrivateKey || !privateKeyAddress) {
        setEnableError('Something went wrong');
        return;
      }
      // Enable handles the row and the event itself; the open-time effects stand down.
      consoleKeyRecorded.current = true;
      consoleKeyAnnounced.current = true;
      if (!isSigner(privateKeyAddress)) {
        await handleEnableSigner(privateKeyAddress);
        setEnabledKey(privateKeyAddress);
        // Enabled again after a turn-off: the list may still show it, and now rightly.
        setPendingRemovals((prev) => {
          const next = new Set(prev);
          return next.delete(privateKeyAddress.toLowerCase()) ? next : prev;
        });
        await refetch();
      }
      await recordConsoleKey(privateKeyAddress);
      publishEvent({ client_id: privateKeyAddress }, true);
      await queryClient.invalidateQueries({ queryKey: ['console-key'] });
    } catch (error: unknown) {
      Sentry.captureException(error);
      setEnableError(txErrorStatus(error).label ?? 'Something went wrong');
    } finally {
      setEnabling(false);
    }
  };

  const consoleKeyOnChain =
    !!consoleKey &&
    onChainRows.some((r) => String(r.address).toLowerCase() === consoleKey);

  // Decided once per mount, from the state at open: a later registry refetch
  // (turning access off) must never re-record the row as active.
  // Console key already a signer: record the registry row if it has none (so
  // members can see console access is on). A console-api write, not a transaction.
  // Waits for the team members too: the row is recorded for the owner's user id.
  useEffect(() => {
    if (!isLicenseOwner || !consoleKey || !registry.isLoaded || registry.isError) return;
    if (!ownerUserId) return;
    if (consoleKeyRecorded.current) return;
    consoleKeyRecorded.current = true;
    if (!consoleKeyOnChain || registry.byAddress.has(consoleKey)) return;
    void recordConsoleKey(consoleKey as `0x${string}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isLicenseOwner,
    consoleKey,
    registry.isLoaded,
    registry.isError,
    registry.byAddress,
    ownerUserId,
  ]);

  // Console access already on: mint the owner's developer JWT as the old open
  // did (off-chain, no transaction), because webhook pages read the stored JWT.
  useEffect(() => {
    if (!isLicenseOwner || !consoleKey || consoleKeyAnnounced.current) return;
    consoleKeyAnnounced.current = true;
    if (!consoleKeyOnChain) return;
    // After the commit: with a warm query cache this runs in the first effect
    // flush, before the sibling DeveloperJwts registers its listener.
    const timer = setTimeout(
      () => publishEvent({ client_id: consoleKey as `0x${string}` }, true),
      0,
    );
    return () => {
      clearTimeout(timer);
      consoleKeyAnnounced.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLicenseOwner, consoleKey]);

  const onConfirmDelete = async () => {
    if (!signerToDelete) {
      throw new Error('No signer to delete');
    }
    setDeleteError(null);
    try {
      await handleDelete(signerToDelete);
      setSignerToDelete(undefined);
    } catch (error: unknown) {
      Sentry.captureException(error);
      setDeleteError(txErrorStatus(error).label ?? 'Something went wrong');
    }
  };

  const consoleOn = isConsoleAccessOn({
    consoleKey,
    signers: onChainRows.map((s) => String(s.address)),
    registry: registry.byAddress,
  });

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
              onClick={() => setHoldersFor({ mode: 'generate' })}
            >
              <KeyIcon className="h-4 w-4" />
              {API_KEY_BUTTON}
            </Button>
          </div>
        )}
      </div>
      {isLicenseOwner && consoleKeyQuery.isLoading ? (
        <p className="text-body-sm text-muted">Checking console access…</p>
      ) : (
        <ConsoleAccess
          isLicenseOwner={isLicenseOwner}
          on={consoleOn}
          enabling={enabling}
          error={enableError}
          onEnable={() => void enableConsoleAccess()}
          clientId={fragment.clientId}
          domain={redirectUris[0]?.uri ?? undefined}
        />
      )}
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
                      consoleKey={
                        String(item.address).toLowerCase() === consoleKey &&
                        !item.offChain
                      }
                      offChain={item.offChain}
                      syncing={item.syncing}
                      unavailable={registry.isError}
                      onAssign={
                        isLicenseOwner &&
                        String(item.address).toLowerCase() !== consoleKey &&
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
          explainer={holdersFor.mode === 'generate' ? API_KEY_EXPLAINER : undefined}
          submitLabel={holdersFor.mode === 'generate' ? 'Generate API key' : 'Save'}
          onSubmit={submitHolders}
          onClose={() => setHoldersFor(null)}
        />
      )}
      <DeleteConfirmationModal
        isOpen={!!signerToDelete}
        title={
          signerToDelete?.toLowerCase() === consoleKey
            ? 'Turn off console access?'
            : 'Are you sure you want to delete this API key?'
        }
        subtitle={
          signerToDelete?.toLowerCase() === consoleKey
            ? CONSOLE_OFF_SUBTITLE
            : DELETE_KEY_SUBTITLE
        }
        loadingLabel="Waiting for the network to confirm…"
        error={deleteError}
        onConfirm={onConfirmDelete}
        onCancel={() => {
          setSignerToDelete(undefined);
          setDeleteError(null);
        }}
        confirmButtonClassName={'error'}
      />
      <APIKeyModal
        isOpen={!!apiKey}
        apiKey={String(apiKey)?.replace('0x', '') ?? ''}
        onClose={() => setApiKey(undefined)}
      />
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
