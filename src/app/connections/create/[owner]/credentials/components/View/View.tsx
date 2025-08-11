'use client';

import React, { use, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BackButton } from '@/components/BackButton';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';
import { CopyButton } from '@/components/CopyButton';

const CredentialField = ({
  label,
  value,
  copyMessage,
}: {
  label: string;
  value: string;
  copyMessage: string;
}) => (
  <div>
    <Label className="text-sm font-medium mb-2 block">{label}</Label>
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-surface-raised rounded-lg px-3 py-2 text-sm text-text-secondary font-mono">
        {value}
      </div>
      <CopyButton
        value={value}
        onCopySuccessMessage={copyMessage}
        className="p-2 hover:bg-surface-raised rounded-lg transition-colors"
      />
    </div>
  </div>
);

export const View = ({ params }: { params: Promise<{ owner: string }> }) => {
  const { owner } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const connectionName = searchParams.get('name') || 'NewOracle';

  // Placeholder creds before db updates
  // TODO: Barrett - db updates
  const credentials = {
    connectionLicensePublicKey: '0xeAa35540a94e3ebdf80448Ae7c9dE5F42CaB3481',
    connectionLicensePrivateKey:
      '0xe**************************************************1776',
    deviceIssuanceKey: '0xe**************************************************3481',
  };

  const goBack = () => {
    const encodedName = encodeURIComponent(connectionName);
    router.replace(`/connections/create/${owner}?name=${encodedName}`);
  };

  useEffect(() => {
    if (!owner) {
      router.replace('/connections');
    }
  }, [owner, router]);

  const handleContinue = () => {
    // TODO: Barrett - post to db
    console.log('Continue clicked');
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
          New license
        </Title>

        <div className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-2 block">Connection Name</Label>
            <div className="bg-surface-raised rounded-lg px-3 py-2">
              <span className="text-text-secondary">{connectionName}</span>
            </div>
          </div>

          <CredentialField
            label="Connection License Public Key"
            value={credentials.connectionLicensePublicKey}
            copyMessage="Connection License Public Key copied!"
          />

          <CredentialField
            label="Connection License Private Key"
            value={credentials.connectionLicensePrivateKey}
            copyMessage="Connection License Private Key copied!"
          />

          <CredentialField
            label="Device Issuance Key"
            value={credentials.deviceIssuanceKey}
            copyMessage="Device Issuance Key copied!"
          />

          <div className="flex gap-4">
            <Button className="primary-outline flex-1" onClick={goBack}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleContinue}>
              Create Connection
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
