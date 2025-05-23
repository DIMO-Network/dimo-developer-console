import { Anchor } from '@/components/Anchor';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/hooks';
import { gtSuper } from '@/utils/font';
import { Button } from '@/components/Button';
import { useState, useRef, useEffect, FC, useContext } from 'react';
import { captureException } from '@sentry/nextjs';
import { NotificationContext } from '@/context/notificationContext';

interface IProps {
  email: string;
  handleSignupComplete: (walletAddress: `0x${string}`) => void;
}

export const OtpSignup: FC<IProps> = ({ email, handleSignupComplete }) => {
  const { setNotification } = useContext(NotificationContext);
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
      const { success, newWalletAddress } = await completeOtpLogin({
        otp: otpString,
        otpId,
        currentWalletValue: null,
        exitstsOnDevConsole: false,
      });

      if (!success) {
        setNotification('Invalid OTP code', 'Error', 'error');
        return;
      }

      handleSignupComplete(newWalletAddress!);
    } catch (error: unknown) {
      setNotification('Something went wrong', 'Error', 'error');
      captureException(error);
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
      //handleVerify();
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
      setNotification('New OTP code sent to your email', 'Success', 'success');
    } catch (error) {
      captureException(error);
      setNotification('Failed to resend OTP code', 'Oops...', 'error');
    } finally {
      setIsRequestingNewOtp(false);
    }
  };

  return (
    <>
      <div className="sign-up__form">
        <div className="sign-up__header">
          <p className={gtSuper.className}>Welcome back!</p>
        </div>
        <div className="otp-login-text">
          <p>
            Enter the code sent to <strong>{email}</strong>
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
            role="continue-button"
            onClick={handleVerify}
            loading={isLoading}
            disabled={otp.some((digit) => !digit)}
          >
            Sign In
          </Button>
          <Button
            className="border invert border-white !mt-3"
            role="continue-button"
            loading={isRequestingNewOtp}
            onClick={handleResendCode}
          >
            Resend Code
          </Button>
        </div>
        <div className="sign-up__extra-links">
          <div className="flex flex-row">
            <p className="terms-caption">
              Trouble logging in?{' '}
              <Anchor href="mailto:developer-support@dimo.org" className="grey underline">
                Get support
              </Anchor>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};
