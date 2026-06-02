'use client';
import { FC, useState } from 'react';
import { gtSuper } from '@/utils/font';
import { Button } from '@/components/Button';
import { IPasskeyRecoveryState } from '@/types/auth';
import { emailRecovery } from '@/actions/user';
import { saveToLocalStorage, EmbeddedKey } from '@/utils/localStorage';
import { generateP256KeyPair } from '@turnkey/crypto';
import { toast } from 'sonner';
import { captureException } from '@sentry/nextjs';

interface IProps {
  state?: Partial<IPasskeyRecoveryState>;
}

export const CheckEmail: FC<IProps> = ({ state }) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleResendCode = async () => {
    try {
      const { email } = state ?? {};
      if (!email) return;
      setIsLoading(true);
      const key = generateP256KeyPair();
      const targetPublicKey = key.publicKeyUncompressed;
      saveToLocalStorage(EmbeddedKey, key.privateKey);
      const success = await emailRecovery(email, targetPublicKey);
      if (success) {
        toast.success('Recovery code successfully resent.');
      }
    } catch (error) {
      toast.error('Something went wrong while sending the recovery code.');
      captureException(error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="email-recovery__form">
      <div className="email-recovery__header">
        <p className={gtSuper.className}>Click the link in your email</p>
      </div>
      <div className="email-recovery__input">
        <p>Not seeing an email? Check your spam folder or resend code.</p>
        <Button
          type="button"
          onClick={handleResendCode}
          loading={isLoading}
          disabled={isLoading}
          className="primary-outline"
          role="cancel-button"
        >
          Resend code
        </Button>
      </div>
    </div>
  );
};
