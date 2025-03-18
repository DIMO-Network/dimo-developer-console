import { IAuth } from '@/types/auth';
import { FC, ReactNode, useContext, useEffect, useState } from 'react';
import { useAuth, useGlobalAccount, usePasskey } from '@/hooks';
import { BubbleLoader } from '@/components/BubbleLoader';
import { NotificationContext } from '@/context/notificationContext';
import * as Sentry from '@sentry/nextjs';
import { gtSuper } from '@/utils/font';
import { Anchor } from '@/components/Anchor';
import { createUserGlobalAccount } from '@/actions/user';
import { PasskeySignup } from '@/app/sign-up/components/WalletCreation/PasskeySignup';
import { useSearchParams } from 'next/navigation';
import { IPasskeyAttestation } from '@/types/wallet';
import { OtpSignup } from './OtpSignup';

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

enum WalletCreationType {
  OTP = 'otp',
  PASSKEY = 'passkey',
}

const WalletCreationForm = ({
  type,
  singupComplete,
}: {
  type: WalletCreationType;
  singupComplete: () => void;
}): ReactNode => {
  switch (type) {
    case WalletCreationType.OTP:
      return <OtpSignup handleSignupComplete={singupComplete} />;
    case WalletCreationType.PASSKEY:
      return <PasskeySignup />;
  }
};

export const WalletCreation: FC<IProps> = ({ onNext }) => {
  const { setNotification } = useContext(NotificationContext);
  const searchParams = useSearchParams();
  const [walletCreationType, setWalletCreationType] = useState<WalletCreationType>(
    WalletCreationType.PASSKEY,
  );
  const { setUser } = useAuth();

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

  const globalAccountSignupComplete = () => {
    onNext('wallet-creation', {});
  };

  const handleWalletCreation = async (email: string) => {
    try {
      const { success, encodedChallenge, attestation } = await tryCreatePasskey(email);

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

      if (!success) {
        setWalletCreationType(WalletCreationType.OTP);
        return;
      }

      globalAccountSignupComplete();

      // if (Object.keys(newOrg).length === 0) {
      //   setNotification(
      //     'Something went wrong while creating the user wallet',
      //     'Oops...',
      //     'error',
      //   );
      //   return;
      // }
      // onNext('wallet-creation', {});
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
    const email = searchParams.get('email');
    if (!email) return;
    void handleWalletCreation(email);
  }, [searchParams]);

  return (
    <WalletCreationForm
      type={walletCreationType}
      singupComplete={globalAccountSignupComplete}
    />
  );
};

export default WalletCreation;
