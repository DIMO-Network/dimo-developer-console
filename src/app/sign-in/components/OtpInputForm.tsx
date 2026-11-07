'use client';

import { Anchor } from '@/components/Anchor';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/hooks/useAuth';
import { FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { captureException } from '@sentry/nextjs';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { explainSignUpRefusal } from '@/app/sign-up/signUpResult';

interface IProps {
  currentEmail: string;
  currentWallet: `0x${string}` | null;
}

export const OtpInputForm: FC<IProps> = ({ currentEmail, currentWallet }) => {
  const t = useTranslations('sign-in');
  const tSignUp = useTranslations('sign-up');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRequestingNewOtp, setIsRequestingNewOtp] = useState<boolean>(false);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<HTMLInputElement[]>([]);
  const { beginOtpLogin, completeOtpLogin } = useAuth();
  const [otpId, setOtpId] = useState<string>('');

  // Ensure we have 6 references for 6 inputs
  useEffect(() => {
    if (inputRefs.current.length !== 6) {
      inputRefs.current = Array(6)
        .fill(null)
        .map(() => document.createElement('input'));
    }

    beginOtpLogin().then((id) => setOtpId(id));
  }, []);

  /**
   * Handle digit input
   */
  const handleChange = (value: string, index: number) => {
    // Only keep the last digit if user typed multiple
    const singleDigit = value.slice(-1).replace(/\D/, '');
    if (!singleDigit) return;

    const newOtp = [...otp];
    newOtp[index] = singleDigit;
    setOtp(newOtp);

    // Move focus to the next input if not on the last one
    if (index < 5 && singleDigit) {
      inputRefs.current[index + 1].focus();
    }
  };

  /**
   * Handle key events:
   * - If user presses backspace and the current input has a value, clear it.
   * - If user presses backspace and the current input is empty, move focus to the previous input (if any).
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (event.key === 'Backspace') {
      event.preventDefault(); // Prevent the default backspace from navigating backward in some browsers

      // If there's a value in the current input, clear it
      if (otp[index]) {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        // Optionally keep focus on the same input (so user can type a new digit)
        inputRefs.current[index]?.focus();
      }
      // Otherwise, move focus to the previous input (if any)
      else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  /**
   * Combine the 6 digits into a single OTP string and verify
   */
  const handleVerify = async () => {
    const otpString = otp.join('');
    try {
      setIsLoading(true);
      const { success } = await completeOtpLogin({
        otp: otpString,
        otpId,
        currentWalletValue: currentWallet,
        existOnDevConsole: true,
      });

      if (!success) {
        toast.error(t('otp.invalidCode'));
        return;
      }

      router.replace('/app');
    } catch (error) {
      if (explainSignUpRefusal(error, () => router.replace('/sign-in'), tSignUp)) return;
      captureException(error);
      toast.error(t('otp.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();

    const pasteData = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasteData) return;

    if (pasteData.length === 6) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      // handleVerify();
    }
  };

  /**
   * Resend the OTP code
   */
  const handleResendCode = async () => {
    try {
      setIsRequestingNewOtp(true);
      const newOtpId = await beginOtpLogin();
      setOtpId(newOtpId);
      setOtp(Array(6).fill(''));
      toast.success(t('otp.resent'));
    } catch (error) {
      captureException(error);
      toast.error(t('otp.resendFailed'));
    } finally {
      setIsRequestingNewOtp(false);
    }
  };

  return (
    <>
      <div className="sign-in__form">
        <div className="sign-in__header">
          <p className="text-title text-ink">{t('otp.title')}</p>
        </div>
        <div className="otp-login-text">
          <p>
            {t.rich('otp.enterCode', {
              email: currentEmail,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
        </div>
        <div className="otp-inputs">
          {Array(6)
            .fill('')
            .map((_, i) => (
              <TextField
                key={i}
                className="otp-input"
                maxLength={1}
                type="text"
                ref={(el) => {
                  if (el) inputRefs.current[i] = el;
                }}
                readOnly={false}
                value={otp[i]}
                onChange={(e) => handleChange(e.target.value, i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onPaste={(e) => handlePaste(e)}
              />
            ))}
        </div>
        <div className="flex w-full flex-col pt-4">
          <Button
            variant="brand"
            role="continue-button"
            onClick={handleVerify}
            disabled={otp.some((digit) => !digit)}
            loading={isLoading}
          >
            {t('otp.signIn')}
          </Button>
          <Button
            variant="secondary"
            className="mt-3!"
            role="continue-button"
            onClick={handleResendCode}
            loading={isRequestingNewOtp}
            disabled={false}
          >
            {t('otp.resendCode')}
          </Button>
        </div>
        <div className="sign-in__extra-links">
          <div className="flex flex-row">
            <p className="terms-caption">
              {t.rich('otp.troubleLoggingIn', {
                support: (chunks) => (
                  <Anchor
                    href="mailto:developer-support@dimo.org"
                    className="grey underline"
                  >
                    {chunks}
                  </Anchor>
                ),
              })}
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
