'use client';
import { FC, useContext, useState } from 'react';
import { gtSuper } from '@/utils/font';
import { Button } from '@/components/Button';
import { IPasskeyRecoveryState } from '@/types/auth';
import { emailRecovery } from '@/actions/user';
import { saveToLocalStorage, EmbeddedKey } from '@/utils/localStorage';
import { generateP256KeyPair } from '@turnkey/crypto';
import { NotificationContext } from '@/context/notificationContext';
import { captureException } from '@sentry/nextjs';

interface IProps {
  state?: Partial<IPasskeyRecoveryState>;
}

export const CheckEmail: FC<IProps> = ({ state }) => {
  const { setNotification } = useContext(NotificationContext);
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
        setNotification('Recovery code successfully resent.', 'Success', 'success');
      }
    } catch (error) {
      setNotification(
        'Something went wrong while sending the recovery code.',
        'Oops...',
        'error',
      );
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
          className="border invert border-white"
          role="cancel-button"
        >
          Resend code
        </Button>
      </div>
    </div>
  );
};
