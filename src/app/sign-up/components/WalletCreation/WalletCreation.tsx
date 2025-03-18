import { IAuth } from '@/types/auth';
import { FC, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
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
import { isNull } from 'lodash';

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
  singupComplete: () => void;
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

      // const { subOrganizationId } = await createUserGlobalAccount({
      //   email,
      //   encodedChallenge,
      //   attestation,
      //   deployAccount: true,
      // });

      const subOrganizationId = '1234';

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
