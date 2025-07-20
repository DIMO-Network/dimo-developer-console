'use client';

import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getDevJwt } from '@/utils/devJwt';
import { BackButton } from '@/components/BackButton';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';

export const View = ({ params }: { params: Promise<{ clientId: string }> }) => {
  const { clientId } = use(params);
  const router = useRouter();
  const devJwt = getDevJwt(clientId);

  const goBack = () => {
    router.replace('/connections');
  };

  useEffect(() => {
    if (!devJwt) {
      goBack();
    }
  }, [clientId, devJwt]);

  const handleNext = () => {
    // TODO: Add popup w details
    console.log('Next clicked');
  };

  return (
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
              defaultValue="NewOracle"
            />
          </div>

          <Button className="w-full" onClick={handleNext}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
