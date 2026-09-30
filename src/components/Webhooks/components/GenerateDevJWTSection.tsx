import { GenerateDevJWT } from '@/components/GenerateDevJWT';
import React from 'react';

export const GenerateDevJWTSection = ({
  clientId,
  redirectUri,
  onSuccess,
  message = 'Please generate a Developer JWT to view your webhook configurations.',
}: {
  clientId: string;
  redirectUri: string;
  onSuccess: () => void;
  message?: string;
}) => {
  return (
    <div>
      <p className={'text-body-sm text-muted'}>{message}</p>
      <GenerateDevJWT
        clientId={clientId}
        domain={redirectUri}
        onSuccess={onSuccess}
        buttonClassName="mt-2"
      />
    </div>
  );
};
