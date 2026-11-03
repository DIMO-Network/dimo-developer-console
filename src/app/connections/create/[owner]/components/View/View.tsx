'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
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
import { findConnectionByName } from '@/services/connectionLookup';
import { generateConnectionWallets } from '@/services/connectionWallets';
import {
  createConnection,
  deleteConnection,
  getConnectionById,
  updateConnection,
  type Connection,
  type ConnectionStatus,
} from '@/actions/connections';
import { invalidateMyConnectionsQuery } from '@/hooks/queries/useMyConnections';

// Server Actions mask what they throw in production, so every failure here is told
// in the page's own words, never with error.message.
const KEYS_NOT_SAVED = "Couldn't save your connection keys, so nothing was minted.";
const FINISH_FROM_CONNECTIONS =
  "Your connection keys are saved, but setup didn't finish. You can finish setup from Connections.";
const LOOKUP_FAILED =
  "Couldn't check whether this connection was already minted, so nothing was spent. Try again.";
const NAME_TAKEN = "This name is taken by another wallet, so setup can't be finished.";
const LOAD_FAILED =
  "Couldn't load this connection. Go back to Connections and try again.";
const CONNECTION_GONE =
  'This connection no longer exists, so there is nothing to finish.';
const OWNER_ONLY = 'Only the team owner can finish setting up this connection.';

const stepLabel = (step: MintConnectionStep): string => {
  switch (step) {
    case 'minting':
      return 'Approve the mint to create your connection on-chain. This costs ~$1 of $DIMO.';
    case 'signing-agreements':
      return 'Signing permission agreements for the Device Issuance Key (mint synthetic devices) and the Connection License Key (generate certificates).';
    case 'granting-permissions':
      return 'Approve the on-chain transaction granting both keys their permissions on this connection.';
  }
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const resumeId = searchParams.get('resume');
  const initialConnectionName = searchParams.get('name') || 'NewConnection';
  const [connectionName, setConnectionName] = useState(initialConnectionName);
  const [isPendingPurchase, setIsPendingPurchase] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Creating connection, please wait...');
  const [error, setError] = useState<string | null>(null);
  const [nameValidationError, setNameValidationError] = useState<string | null>(null);
  // The connection being resumed, once it's known to be finishable.
  const [resumable, setResumable] = useState<Connection | null>(null);
  // Set when this page has nothing left to offer: only Connections goes on from here.
  const [stopped, setStopped] = useState<string | null>(null);

  const { currentUser } = useGlobalAccount();
  const { mint, grant } = useMintConnection();

  const validateConnectionName = useCallback((name: string) => {
    const nameBytes = new TextEncoder().encode(name).length;
    if (nameBytes > 32) {
      return 'Connection name is too long. Please use a name that is 32 characters or fewer.';
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
    getConnectionById(resumeId).then(
      (connection) => {
        if (abandoned) return;
        if (!connection) {
          setStopped(CONNECTION_GONE);
        } else if (connection.status !== 'PENDING' && connection.status !== 'MINTED') {
          router.replace('/connections');
        } else if (
          !connection.connection_license_private_key ||
          !connection.device_issuance_key
        ) {
          setStopped(OWNER_ONLY);
        } else {
          setResumable(connection);
        }
      },
      () => {
        if (!abandoned) setStopped(LOAD_FAILED);
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

  const stop = (message: string) => {
    setIsPendingPurchase(false);
    setStopped(message);
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
      onStep: (step) => setLoadingLabel(stepLabel(step)),
    });

    setLoadingLabel('Saving your connection…');
    await saveProgress(id, { status: 'READY' });

    setIsPendingPurchase(false);
    router.replace('/connections?success=connection-created');
  };

  const recordMintAndComplete = async (
    id: string,
    connectionId: bigint,
    grantees: Grantees,
  ) => {
    setLoadingLabel('Saving your connection…');
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
      stop(FINISH_FROM_CONNECTIONS);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Generate the keys and save them before anything is spent: the mint can't be
  // undone, and keys lost after it are gone for good.
  const saveNewKeys = async () => {
    try {
      setLoadingLabel('Generating your connection keys…');
      const wallets = await generateConnectionWallets();

      setLoadingLabel('Saving your connection keys…');
      const { id } = await createConnection({
        name: connectionName,
        connection_license_public_key: wallets.connectionLicense.publicKey,
        connection_license_private_key: wallets.connectionLicense.privateKey,
        device_issuance_key: wallets.deviceIssuance.privateKey,
        status: 'PENDING',
      });
      return {
        id,
        grantees: {
          licenseGrantee: wallets.connectionLicense.publicKey,
          deviceIssuanceGrantee: wallets.deviceIssuance.publicKey,
        },
      };
    } catch (error) {
      console.error('Saving the connection keys failed:', error);
      setError(KEYS_NOT_SAVED);
      return null;
    }
  };

  // Only a refused mint on the first attempt deletes: nothing landed, and this row is
  // new. If the delete fails the row stays PENDING, and the list offers to finish it.
  const removeRefusedConnection = async (id: string, reason: string) => {
    console.error('Connection minting failed', reason);
    setError(reason);
    try {
      await deleteConnection(id);
      await invalidateMyConnectionsQuery();
    } catch (error) {
      console.error('Removing the refused connection failed:', error);
    }
  };

  const startSetup = async () => {
    const saved = await saveNewKeys();
    if (!saved) return;
    await invalidateMyConnectionsQuery();

    setLoadingLabel(stepLabel('minting'));
    const minted = await mint(connectionName);
    if (!minted.success) {
      await removeRefusedConnection(saved.id, minted.reason);
      return;
    }

    await recordMintAndComplete(saved.id, minted.connectionId, saved.grantees);
  };

  // Only reached once Identity has said nobody holds the name.
  const mintResumed = async (connection: Connection) => {
    const grantees = granteesOf(connection);
    setIsPendingPurchase(false);

    setLoadingLabel(stepLabel('minting'));
    const minted = await mint(connection.name);
    if (!minted.success) {
      console.error('Connection minting failed', minted.reason);
      setError(minted.reason);
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
      setError(LOOKUP_FAILED);
      return;
    }

    setLoadingLabel('Checking whether your connection was already minted…');
    let found;
    try {
      found = await findConnectionByName(connection.name);
    } catch (error) {
      console.error('Looking up the connection failed:', error);
      setError(LOOKUP_FAILED);
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
      stop(NAME_TAKEN);
    }
  };

  const handleContinuePayment = () =>
    runSetup(resumable ? () => mintResumed(resumable) : startSetup);

  const handleCancelPayment = useCallback(() => {
    console.log('User cancelled payment');
    setIsPendingPurchase(false);
    setError(null);
  }, []);

  const pageTitle = resumeId ? 'Finish setup' : 'New connection';
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
            {stopped}
          </p>
          <Link href="/connections" className="button secondary">
            Back to Connections
          </Link>
        </div>
      );
    }

    if (resumeId) {
      if (!resumable) {
        return <p className="text-body-sm text-muted">Loading your connection…</p>;
      }
      return (
        <div className="space-y-6">
          <p className="text-body-sm text-muted">
            <span className="font-semibold text-ink">{resumable.name}</span> isn&apos;t
            finished yet. Its keys are saved, so setup can pick up where it stopped.
          </p>
          {errorNote}
          <Button
            className="w-full"
            onClick={() => runSetup(() => resumeSetup(resumable))}
            disabled={isProcessingPayment}
          >
            Finish setup
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div>
          <Label htmlFor="connectionName">Connection name</Label>
          <TextField
            id="connectionName"
            type="text"
            placeholder="Connection name"
            className="mt-1"
            value={connectionName}
            onChange={handleConnectionNameChange}
          />
          {nameValidationError && (
            <div className="mt-2">
              <TextError errorMessage={nameValidationError} />
            </div>
          )}
        </div>

        <Button
          className="w-full"
          onClick={handlePurchaseAlert}
          disabled={!!nameValidationError}
        >
          Purchase connection license
        </Button>
      </div>
    );
  };

  return (
    <>
      <nav className="mb-2 flex items-center gap-1.5 text-label text-muted">
        <Link href="/connections" className="transition-colors hover:text-ink">
          Connections
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
            Purchase connection license
          </Title>
          <div className="pt-4 text-body-sm font-normal leading-relaxed text-muted">
            <p className="mb-4">
              <span className="font-semibold text-ink">Warning!</span> By proceeding, you
              are agreeing to approve payment of{' '}
              <span className="font-semibold text-ink">$1 in</span> credits for your DIMO
              Connection License. If you do not have enough credits in your account, you
              will be unable to create a Connection License.
            </p>
            <p>
              You only need to purchase a license if you are planning on hosting a DIMO
              Oracle.
            </p>
          </div>

          {error && <div className="pt-4">{errorNote}</div>}

          <div className="purchase-buttons mt-2 flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={handleCancelPayment}
              disabled={isProcessingPayment}
            >
              Cancel
            </Button>
            <Button onClick={handleContinuePayment} disabled={isProcessingPayment}>
              Continue with payment
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
