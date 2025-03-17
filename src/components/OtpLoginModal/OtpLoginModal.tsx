import { FC, useContext, useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Modal } from '@/components/Modal';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { Title } from '@/components/Title';

import './OtpLoginModal.css';
import { GlobalAccountAuthContext } from '@/context/GlobalAccountContext';
import { useSession } from 'next-auth/react';

interface IProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const OtpLoginModal: FC<IProps> = ({ isOpen, setIsOpen }: IProps) => {
  const { completeOtpLogin } = useContext(GlobalAccountAuthContext);
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Store each digit in an array of length 6
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  // References to each input for easy focus management
  const inputRefs = useRef<HTMLInputElement[]>([]);

  // Ensure we have 6 references for 6 inputs
  useEffect(() => {
    if (inputRefs.current.length !== 6) {
      inputRefs.current = Array(6)
        .fill(null)
        .map(() => document.createElement('input'));
    }
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
      await completeOtpLogin({
        otp: otpString,
        email: session!.user.email!,
      });
    } catch (error) {
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} className="otp-login-modal">
      <div className="otp-login-content">
        <div className="otp-login-header">
          <Title className="text-2xl" component="h3">
            Verify your identity
          </Title>
        </div>
        <div className="otp-login-text">
          <p>
            Check your email for a 6-digit one-time password (OTP) and enter it to create
            your account. If you don’t see it, check your spam folder or resend the code
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
              />
            ))}
        </div>
        <div className="flex w-full flex-col pt-4">
          <Button
            className="primary !h-9"
            role="continue-button"
            onClick={handleVerify}
            loading={isLoading}
            disabled={otp.some((digit) => !digit)}
          >
            Verify Code
          </Button>
        </div>
      </div>
    </Modal>
  );
};
