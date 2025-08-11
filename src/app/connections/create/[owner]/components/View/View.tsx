'use client';

import React, { use, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { Modal } from '@/components/Modal';

export const View = ({ params }: { params: Promise<{ owner: string }> }) => {
  const { owner } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialConnectionName = searchParams.get('name') || 'NewOracle';
  const [connectionName, setConnectionName] = useState(initialConnectionName);
  const [isPendingPurchase, setIsPendingPurchase] = useState(false);

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
    // setTimeout(() => {
    //   setIsPendingPurchase(false);
    //   // Navigate to the credentials page with the connection name as a parameter
    //   const encodedName = encodeURIComponent(connectionName);
    //   router.push(`/connections/create/${owner}/credentials?name=${encodedName}`);
    // }, 3000);
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <BackButton onBack={goBack} />
          <Title component="h1" className="text-2xl font-bold">
            Create a connection
          </Title>
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
                placeholder="NewOracle"
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
            By proceeding, you are agreeing to approve payment of $100 (100,000 DCX) for
            your DIMO Connection License. If you do not have enough DCX in your account,
            you will be unable to create a Connection License.
          </p>
          <div className="purchase-buttons pt-6">
            <Button className="w-48">Cancel</Button>
            <Button className="w-48">Continue with Payment</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};
