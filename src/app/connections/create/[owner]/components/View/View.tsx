'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { Modal } from '@/components/Modal';
import { LoadingModal } from '@/components/LoadingModal';
import { TextError } from '@/components/TextError';
import { useMintConnection, type MintConnectionStep } from '@/hooks/useTransactions';
import { generateConnectionWallets } from '@/services/connectionWallets';
import { createConnection } from '@/actions/connections';
import { invalidateMyConnectionsQuery } from '@/hooks/queries/useMyConnections';

export const View = ({ params }: { params: Promise<{ owner: string }> }) => {
  const { owner } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialConnectionName = searchParams.get('name') || 'NewConnection';
  const [connectionName, setConnectionName] = useState(initialConnectionName);
  const [isPendingPurchase, setIsPendingPurchase] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState('Creating connection, please wait...');
  const [error, setError] = useState<string | null>(null);
  const [nameValidationError, setNameValidationError] = useState<string | null>(null);

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

  const mintConnection = useMintConnection();

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

  const handlePurchaseAlert = () => {
    setIsPendingPurchase(true);
    setError(null);
  };

  const handleContinuePayment = useCallback(async () => {
    setIsProcessingPayment(true);
    setError(null);
    try {
      // Generate connection wallets first so we can grant the keys' EOA
      // addresses the right SACD permissions in the same mint+permission flow.
      setLoadingLabel('Generating your connection keys…');
      const wallets = await generateConnectionWallets();

      const result = await mintConnection({
        connectionName,
        licenseGrantee: wallets.connectionLicense.publicKey,
        deviceIssuanceGrantee: wallets.deviceIssuance.publicKey,
        onStep: (step) => setLoadingLabel(stepLabel(step)),
      });

      if (result.success === false) {
        console.error('Connection minting failed', result.reason);
        setError(result.reason || 'Failed to mint connection');
        return;
      }

      setLoadingLabel('Saving your connection…');
      await createConnection({
        name: connectionName,
        connection_license_public_key: wallets.connectionLicense.publicKey,
        connection_license_private_key: wallets.connectionLicense.privateKey,
        device_issuance_key: wallets.deviceIssuance.privateKey,
      });

      await invalidateMyConnectionsQuery();

      setIsPendingPurchase(false);

      router.replace('/connections?success=connection-created');
    } catch (error) {
      console.error('Connection creation error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsProcessingPayment(false);
    }
  }, [connectionName, mintConnection, router]);

  const handleCancelPayment = useCallback(() => {
    console.log('User cancelled payment');
    setIsPendingPurchase(false);
    setError(null);
  }, []);

  return (
    <>
      <nav className="mb-2 flex items-center gap-1.5 text-label text-muted">
        <Link href="/connections" className="transition-colors hover:text-ink">
          Connections
        </Link>
        <span>/</span>
        <span className="text-ink">New connection</span>
      </nav>
      <div className="flex flex-col gap-8">
        <div className="max-w-2xl">
          <Title component="h2" className="mb-6 text-title">
            New connection
          </Title>

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

          {error && (
            <div className="pt-4">
              <p className="rounded-control bg-negative-soft p-3 text-body-sm text-negative">
                {error}
              </p>
            </div>
          )}

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
