'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { privateKeyToAddress } from 'viem/accounts';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { Modal } from '@/components/Modal';
import { LoadingModal } from '@/components/LoadingModal';
import { TextError } from '@/components/TextError';
import {
  useMintConnection,
  type GrantConnectionParams,
  type MintConnectionStep,
} from '@/hooks/useTransactions';
import { useGlobalAccount } from '@/hooks/useGlobalAccount';
import { findMintedConnection } from '@/services/connectionLookup';
import { generateConnectionWallets } from '@/services/connectionWallets';
import {
  createConnection,
  deleteConnection,
  updateConnection,
  type Connection,
  type ConnectionStatus,
} from '@/actions/connections';
import { fetchJson } from '@/utils/fetchJson';
import { HttpError } from '@/utils/httpError';
import { invalidateMyConnectionsQuery } from '@/hooks/queries/useMyConnections';

// Server Actions mask what they throw in production, so every failure here is told
// in the page's own words, never with error.message. State that holds a message
// for the page keeps its key in the connections area and is translated on render.
const STEP_KEYS: Record<MintConnectionStep, string> = {
  'minting': 'create.steps.minting',
  'signing-agreements': 'create.steps.signingAgreements',
  'granting-permissions': 'create.steps.grantingPermissions',
};

type Grantees = Pick<GrantConnectionParams, 'licenseGrantee' | 'deviceIssuanceGrantee'>;

// generateConnectionWallets' publicKey is the key's address, so the first run grants
// these same two addresses. The row keeps the license address, but for device issuance
// only the private key.
const granteesOf = (connection: Connection): Grantees => ({
  licenseGrantee: connection.connection_license_public_key as `0x${string}`,
  deviceIssuanceGrantee: privateKeyToAddress(
    connection.device_issuance_key as `0x${string}`,
  ),
});

export const View = ({ params }: { params: Promise<{ owner: string }> }) => {
  const { owner } = use(params);
  const t = useTranslations('connections');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const searchParams = useSearchParams();

  const resumeId = searchParams.get('resume');
  const initialConnectionName = searchParams.get('name') || 'NewConnection';
  const [connectionName, setConnectionName] = useState(initialConnectionName);
  const [isPendingPurchase, setIsPendingPurchase] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(() => t('create.creating'));
  const [error, setError] = useState<string | null>(null);
  const [nameValidationError, setNameValidationError] = useState<string | null>(null);
  // The connection being resumed, once it's known to be finishable.
  const [resumable, setResumable] = useState<Connection | null>(null);
  // The key of the message shown when this page has nothing left to offer: only
  // Connections goes on from here.
  const [stopped, setStopped] = useState<string | null>(null);

  const { currentUser } = useGlobalAccount();
  const { mint, grant } = useMintConnection();

  const validateConnectionName = useCallback((name: string) => {
    const nameBytes = new TextEncoder().encode(name).length;
    if (nameBytes > 32) {
      return 'create.nameTooLong';
    }
    return null;
  }, []);

  const handleConnectionNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newName = e.target.value;
      setConnectionName(newName);
      const validationError = validateConnectionName(newName);
      setNameValidationError(validationError);
    },
    [validateConnectionName],
  );

  const goBack = useCallback(() => {
    router.replace('/connections');
  }, [router]);

  useEffect(() => {
    if (!owner) {
      goBack();
    }
  }, [owner, goBack]);

  useEffect(() => {
    if (!resumeId) return;
    let abandoned = false;
    fetchJson<Connection>(`/api/connections/${encodeURIComponent(resumeId)}`).then(
      (connection) => {
        if (abandoned) return;
        if (connection.status !== 'PENDING' && connection.status !== 'MINTED') {
          router.replace('/connections');
        } else if (connection.keys_unreadable) {
          setStopped('create.keysUnreadableOnResume');
        } else if (
          !connection.connection_license_private_key ||
          !connection.device_issuance_key
        ) {
          setStopped('create.ownerOnly');
        } else {
          setResumable(connection);
        }
      },
      (error: unknown) => {
        if (abandoned) return;
        setStopped(
          error instanceof HttpError && error.status === 404
            ? 'create.gone'
            : 'create.loadFailed',
        );
      },
    );
    return () => {
      abandoned = true;
    };
  }, [resumeId, router]);

  const handlePurchaseAlert = () => {
    setIsPendingPurchase(true);
    setError(null);
  };

  const stop = (messageKey: string) => {
    setIsPendingPurchase(false);
    setStopped(messageKey);
  };

  const saveProgress = async (
    id: string,
    patch: { status: ConnectionStatus; token_id?: string },
  ) => {
    await updateConnection(id, patch);
    await invalidateMyConnectionsQuery();
  };

  const grantAndComplete = async (
    id: string,
    connectionId: bigint,
    grantees: Grantees,
  ) => {
    await grant({
      connectionId,
      ...grantees,
      onStep: (step) => setLoadingLabel(t(STEP_KEYS[step])),
    });

    setLoadingLabel(t('create.saving'));
    await saveProgress(id, { status: 'READY' });

    setIsPendingPurchase(false);
    router.replace('/connections?success=connection-created');
  };

  const recordMintAndComplete = async (
    id: string,
    connectionId: bigint,
    grantees: Grantees,
  ) => {
    setLoadingLabel(t('create.saving'));
    await saveProgress(id, { status: 'MINTED', token_id: connectionId.toString() });
    await grantAndComplete(id, connectionId, grantees);
  };

  // Past the point the keys are saved, a failure may have spent the user's DIMO. The
  // row stays whatever went wrong, and resume picks it up from Connections: asking to
  // pay again here would make new keys for a name the first attempt may own.
  const runSetup = async (setup: () => Promise<void>) => {
    setIsProcessingPayment(true);
    setError(null);
    try {
      await setup();
    } catch (error) {
      console.error('Connection setup stopped:', error);
      stop('create.finishFromConnections');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Generate the keys and save them before anything is spent: the mint can't be
  // undone, and keys lost after it are gone for good.
  const saveNewKeys = async () => {
    try {
      setLoadingLabel(t('create.generatingKeys'));
      const wallets = await generateConnectionWallets();

      setLoadingLabel(t('create.savingKeys'));
      const created = await createConnection({
        name: connectionName,
        connection_license_public_key: wallets.connectionLicense.publicKey,
        connection_license_private_key: wallets.connectionLicense.privateKey,
        device_issuance_key: wallets.deviceIssuance.privateKey,
        status: 'PENDING',
      });
      if (!created.ok) {
        if (created.code === 'CONNECTION_NAME_TAKEN') {
          setIsPendingPurchase(false);
          setNameValidationError('create.nameTakenInTeam');
        } else {
          console.error('Saving the connection keys failed:', created.status);
          setError(t('create.keysNotSaved'));
        }
        return null;
      }
      const { id } = created.data;
      return {
        id,
        grantees: {
          licenseGrantee: wallets.connectionLicense.publicKey,
          deviceIssuanceGrantee: wallets.deviceIssuance.publicKey,
        },
      };
    } catch (error) {
      console.error('Saving the connection keys failed:', error);
      setError(t('create.keysNotSaved'));
      return null;
    }
  };

  // Only a refused mint on the first attempt deletes: nothing landed, and this row is
  // new. If the delete fails the row stays PENDING, and the list offers to finish it.
  // A delete that throws (no answer, or the proxy's 401) must not reach runSetup, whose
  // message would replace the refusal's.
  const removeRefusedConnection = async (id: string, reason: string) => {
    console.error('Connection minting failed', reason);
    setError(reason);
    const removed = await deleteConnection(id).catch(() => null);
    if (!removed?.ok) {
      console.error(
        'Removing the refused connection failed:',
        removed?.status ?? 'threw',
      );
      return;
    }
    await invalidateMyConnectionsQuery();
  };

  const startSetup = async () => {
    const saved = await saveNewKeys();
    if (!saved) return;
    await invalidateMyConnectionsQuery();

    setLoadingLabel(t(STEP_KEYS.minting));
    const minted = await mint(connectionName);
    if (!minted.success) {
      await removeRefusedConnection(saved.id, minted.reason);
      return;
    }

    await recordMintAndComplete(saved.id, minted.connectionId, saved.grantees);
  };

  // Only reached once Identity and the chain have both said nobody holds the name.
  const mintResumed = async (connection: Connection) => {
    const grantees = granteesOf(connection);
    setIsPendingPurchase(false);

    setLoadingLabel(t(STEP_KEYS.minting));
    const minted = await mint(connection.name);
    if (!minted.success) {
      console.error('Connection minting failed', minted.reason);
      // There's no name to change on this page, and the earlier attempt may hold it.
      setError(minted.nameInUse ? t('create.nameRefusedOnResume') : minted.reason);
      return;
    }

    await recordMintAndComplete(connection.id, minted.connectionId, grantees);
  };

  const resumeSetup = async (connection: Connection) => {
    if (connection.status === 'MINTED' && connection.token_id) {
      await grantAndComplete(
        connection.id,
        BigInt(connection.token_id),
        granteesOf(connection),
      );
      return;
    }

    // The browser may have died after the mint landed and before it was recorded.
    // Minting again would only hit NameAlreadyInUse, so ask who holds the name first,
    // and spend nothing unless Identity says nobody does. A connection belongs to the
    // smart account: useMintConnection mints to it, and it sends the transaction.
    const wallet = currentUser?.smartContractAddress?.toLowerCase();
    if (!wallet) {
      setError(t('create.lookupFailed'));
      return;
    }

    setLoadingLabel(t('create.checkingMinted'));
    let found;
    try {
      found = await findMintedConnection(connection.name);
    } catch (error) {
      console.error('Looking up the connection failed:', error);
      setError(t('create.lookupFailed'));
      return;
    }

    if (!found) {
      setIsPendingPurchase(true);
    } else if (found.owner.toLowerCase() === wallet) {
      await recordMintAndComplete(
        connection.id,
        BigInt(found.tokenId),
        granteesOf(connection),
      );
    } else {
      stop('create.nameTaken');
    }
  };

  const handleContinuePayment = () =>
    runSetup(resumable ? () => mintResumed(resumable) : startSetup);

  const handleCancelPayment = useCallback(() => {
    console.log('User cancelled payment');
    setIsPendingPurchase(false);
    setError(null);
  }, []);

  const pageTitle = resumeId ? t('create.titleFinish') : t('create.titleNew');
  const errorNote = error && (
    <p className="rounded-control bg-negative-soft p-3 text-body-sm text-negative">
      {error}
    </p>
  );

  const renderContent = () => {
    if (stopped) {
      return (
        <div className="space-y-6">
          <p className="rounded-control bg-negative-soft p-3 text-body-sm text-negative">
            {t(stopped)}
          </p>
          <Link href="/connections" className="button secondary">
            {t('breadcrumb.back')}
          </Link>
        </div>
      );
    }

    if (resumeId) {
      if (!resumable) {
        return <p className="text-body-sm text-muted">{t('create.loading')}</p>;
      }
      return (
        <div className="space-y-6">
          <p className="text-body-sm text-muted">
            {t.rich('create.resumeNote', {
              name: resumable.name,
              strong: (chunks) => (
                <span className="font-semibold text-ink">{chunks}</span>
              ),
            })}
          </p>
          {errorNote}
          <Button
            className="w-full"
            onClick={() => runSetup(() => resumeSetup(resumable))}
            disabled={isProcessingPayment}
          >
            {t('create.finishSetup')}
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="connectionName">{t('create.nameLabel')}</Label>
          <TextField
            id="connectionName"
            type="text"
            placeholder={t('create.namePlaceholder')}
            className="mt-1"
            value={connectionName}
            onChange={handleConnectionNameChange}
          />
          {nameValidationError && (
            <div className="mt-2">
              <TextError errorMessage={t(nameValidationError)} />
            </div>
          )}
        </div>

        <Button
          className="w-full"
          onClick={handlePurchaseAlert}
          disabled={!!nameValidationError}
        >
          {t('create.purchase')}
        </Button>
      </div>
    );
  };

  return (
    <>
      <nav className="mb-2 flex items-center gap-1.5 text-label text-muted">
        <Link href="/connections" className="transition-colors hover:text-ink">
          {t('breadcrumb.connections')}
        </Link>
        <span>/</span>
        <span className="text-ink">{pageTitle}</span>
      </nav>
      <div className="flex flex-col gap-8">
        <div className="max-w-2xl">
          <Title component="h2" className="mb-6 text-title">
            {pageTitle}
          </Title>

          {renderContent()}
        </div>
      </div>

      <LoadingModal
        isOpen={isProcessingPayment}
        setIsOpen={() => {}}
        label={loadingLabel}
        status="loading"
      />

      <Modal
        isOpen={isPendingPurchase && !isProcessingPayment}
        setIsOpen={setIsPendingPurchase}
        className="purchase-confirmation"
      >
        <div>
          <Title className="pr-8 text-panel-title" component="h3">
            {t('create.modal.title')}
          </Title>
          <div className="pt-4 text-body-sm font-normal leading-relaxed text-muted">
            <p className="mb-4">
              {t.rich('create.modal.warning', {
                strong: (chunks) => (
                  <span className="font-semibold text-ink">{chunks}</span>
                ),
              })}
            </p>
            <p>{t('create.modal.oracleOnly')}</p>
          </div>

          {error && <div className="pt-4">{errorNote}</div>}

          <div className="purchase-buttons mt-2 flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={handleCancelPayment}
              disabled={isProcessingPayment}
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button onClick={handleContinuePayment} disabled={isProcessingPayment}>
              {t('create.continuePayment')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
