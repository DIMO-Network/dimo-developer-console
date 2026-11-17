'use client';
import { FC, useState } from 'react';
import { Button } from '@/components/Button';
import { IPasskeyRecoveryState } from '@/types/auth';
import { emailRecovery } from '@/actions/user';
import { saveToLocalStorage, EmbeddedKey } from '@/utils/localStorage';
import { generateP256KeyPair } from '@turnkey/crypto';
import { toast } from 'sonner';
import { captureException } from '@sentry/nextjs';
import { useTranslations } from 'next-intl';

interface IProps {
  state?: Partial<IPasskeyRecoveryState>;
}

export const CheckEmail: FC<IProps> = ({ state }) => {
  const t = useTranslations('email-recovery');
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
        toast.success(t('checkEmail.resent'));
      }
    } catch (error) {
      toast.error(t('checkEmail.resendFailed'));
      captureException(error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="email-recovery__form">
      <div className="email-recovery__header">
        <p className="text-title text-ink">{t('checkEmail.title')}</p>
      </div>
      <div className="email-recovery__input">
        <p className="text-body-sm text-muted">{t('checkEmail.hint')}</p>
        <Button
          type="button"
          onClick={handleResendCode}
          loading={isLoading}
          disabled={isLoading}
          variant="secondary"
          role="cancel-button"
        >
          {t('checkEmail.resend')}
        </Button>
      </div>
    </div>
  );
};
