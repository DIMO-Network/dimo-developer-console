'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { Modal } from '@/components/Modal';
import { useMintConnection } from '@/hooks/useTransactions';
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
  const [error, setError] = useState<string | null>(null);

  const mintConnection = useMintConnection();

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
      // Step 1: Mint the connection license on-chain
      const result = await mintConnection(connectionName);

      console.log('MINT TEST RESULT:', result);

      if (result.success === false) {
        console.error('Connection minting failed', result.reason);
        setError(result.reason || 'Failed to mint connection');
        return;
      }

      // Step 2: Generate connection wallets and credentials
      console.log('Generating connection wallets...');
      const wallets = await generateConnectionWallets();

      // Step 3: Save connection data to database
      console.log('Saving connection to database...');
      await createConnection({
        name: connectionName,
        connection_license_public_key: wallets.connectionLicense.publicKey,
        connection_license_private_key: wallets.connectionLicense.privateKey,
        device_issuance_key: wallets.deviceIssuance.privateKey,
      });

      await invalidateMyConnectionsQuery();

      setIsPendingPurchase(false);

      router.replace('/connections');
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
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <BackButton onBack={goBack} />
        </div>

        <div className="max-w-2xl">
          <Title component="h2" className="text-xl mb-6">
            New connection
          </Title>

          <div className="space-y-6">
            <div>
              <Label htmlFor="connectionName" className="text-sm font-medium">
                Connection Name
              </Label>
              <TextField
                id="connectionName"
                type="text"
                placeholder="Connection Name"
                className="mt-1"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={handlePurchaseAlert}>
              Purchase Connection License
            </Button>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isPendingPurchase}
        setIsOpen={setIsPendingPurchase}
        className="purchase-confirmation"
      >
        <div>
          <Title className="text-2xl" component="h3">
            Purchase Connection License
          </Title>
          <p className="pt-4 text-sm text-text-secondary font-normal">
            By proceeding, you are agreeing to approve payment of $100 worth of $DIMO
            tokens at market prices for your DIMO Connection License. If you do not have
            enough $DIMO tokens in your account, you will be unable to create a Connection
            License.
          </p>

          {error && (
            <div className="pt-4">
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                {error}
              </p>
            </div>
          )}

          <div className="purchase-buttons pt-6 flex gap-4">
            <Button
              className="w-48"
              onClick={handleCancelPayment}
              disabled={isProcessingPayment}
            >
              Cancel
            </Button>
            <Button
              className="w-48"
              onClick={handleContinuePayment}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? 'Processing...' : 'Continue with Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
