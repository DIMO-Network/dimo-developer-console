import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import React from 'react';

export const GenerateDevJWTSection = ({
  clientId,
  redirectUri,
  onSuccess,
}: {
  clientId: string;
  redirectUri: string;
  onSuccess: () => void;
}) => {
  return (
    <div>
      <p className={'text-text-secondary'}>
        Please generate a Developer JWT to view your webhook configurations.
      </p>
      <GenerateDevJWT
        clientId={clientId}
        domain={redirectUri}
        onSuccess={onSuccess}
        buttonClassName="mt-2"
      />
    </div>
  );
};
