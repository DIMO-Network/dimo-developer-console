import { IAuth } from '@/types/auth';
import { FC, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth, usePasskey } from '@/hooks';
import { NotificationContext } from '@/context/notificationContext';
import * as Sentry from '@sentry/nextjs';

import { createUserGlobalAccount } from '@/actions/user';
import { PasskeySignup } from '@/app/sign-up/components/WalletCreation/PasskeySignup';
import { useSearchParams } from 'next/navigation';
import { IPasskeyAttestation } from '@/types/wallet';
import { OtpSignup } from './OtpSignup';
import { isNull } from 'lodash';
import { createNewUser } from '@/services/user';

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

enum WalletCreationType {
  OTP = 'otp',
  PASSKEY = 'passkey',
}

const WalletCreationForm = ({
  email,
  type,
  singupComplete,
}: {
  email: string;
  type: WalletCreationType;
  singupComplete: (walletAddress: `0x${string}`) => void;
}): ReactNode => {
  switch (type) {
    case WalletCreationType.OTP:
      return <OtpSignup handleSignupComplete={singupComplete} email={email} />;
    case WalletCreationType.PASSKEY:
      return <PasskeySignup />;
  }
};

export const WalletCreation: FC<IProps> = ({ onNext }) => {
  const { setNotification } = useContext(NotificationContext);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string>('');
  const [walletCreationType, setWalletCreationType] = useState<WalletCreationType>(
    WalletCreationType.PASSKEY,
  );
  const { setUser, loginWithPasskey } = useAuth();

  const { isPasskeyAvailable, getNewUserPasskey } = usePasskey();

  const tryCreatePasskey = async (
    email: string,
  ): Promise<{
    success: boolean;
    encodedChallenge?: string;
    attestation?: IPasskeyAttestation;
  }> => {
    try {
      if (!isPasskeyAvailable) {
        return {
          success: false,
        };
      }
      const { encodedChallenge, attestation } = await getNewUserPasskey(email);
      return {
        success: true,
        encodedChallenge,
        attestation,
      };
    } catch (error) {
      return {
        success: false,
      };
    }
  };

  const globalAccountSignupComplete = (walletAddress: `0x${string}`) => {
    createNewUser({
      name: email,
      email: email,
      address: walletAddress,
    }).then(() => {
      onNext('wallet-creation', {
        email: email,
        address: walletAddress,
      });
    });
  };

  const handleWalletCreation = async (email: string) => {
    try {
      const {
        success: withPasskey,
        encodedChallenge,
        attestation,
      } = await tryCreatePasskey(email);

      const { subOrganizationId } = await createUserGlobalAccount({
        email,
        encodedChallenge,
        attestation,
        deployAccount: true,
      });

      setUser({
        email,
        subOrganizationId,
      });

      if (!withPasskey) {
        setWalletCreationType(WalletCreationType.OTP);
        return;
      }

      const { success, wallet } = await loginWithPasskey();
      if (!success) {
        setNotification(
          'Something went wrong while creating the user wallet',
          'Oops...',
          'error',
        );
        return;
      }

      globalAccountSignupComplete(wallet);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Something went wrong while creating the user wallet', error);
      setNotification(
        'Something went wrong while creating the user wallet',
        'Oops...',
        'error',
      );
    }
  };

  useEffect(() => {
    if (isNull(isPasskeyAvailable)) return;
    const email = searchParams.get('email');
    if (!email) return;
    setEmail(email);
    void handleWalletCreation(email);
  }, [searchParams, isPasskeyAvailable]);

  return (
    <WalletCreationForm
      email={email}
      type={walletCreationType}
      singupComplete={globalAccountSignupComplete}
    />
  );
};

export default WalletCreation;
