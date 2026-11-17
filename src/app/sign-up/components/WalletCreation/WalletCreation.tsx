'use client';
import { IAuth } from '@/types/auth';
import { FC, ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMixPanel } from '@/hooks/useMixPanel';
import { usePasskey } from '@/hooks/usePasskey';
import { toast } from 'sonner';
import * as Sentry from '@sentry/nextjs';

import { createUserGlobalAccount } from '@/actions/user';
import { PasskeySignup } from '@/app/sign-up/components/WalletCreation/PasskeySignup';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { IPasskeyAttestation } from '@/types/wallet';
import { OtpSignup } from './OtpSignup';
import { isNull } from 'lodash';
import { getUserSubOrganization } from '@/services/globalAccount';
import { NoPasskeySignup } from './NoPasskeyAccount';
import { AccountFoundSignup } from './AccountFound';
import { explainSignUpRefusal } from '@/app/sign-up/signUpResult';

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

enum WalletCreationType {
  OTP = 'otp',
  PASSKEY = 'passkey',
  NO_PASSKEY = 'no-passkey',
  HAS_ACCOUNT = 'has-account',
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
    case WalletCreationType.NO_PASSKEY:
      return <NoPasskeySignup />;
    case WalletCreationType.HAS_ACCOUNT:
      return <AccountFoundSignup />;
    case WalletCreationType.OTP:
      return <OtpSignup handleSignupComplete={singupComplete} email={email} />;
    case WalletCreationType.PASSKEY:
      return <PasskeySignup />;
  }
};

export const WalletCreation: FC<IProps> = ({ onNext }) => {
  const t = useTranslations('sign-up');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { trackEvent } = useMixPanel();
  const [email, setEmail] = useState<string>('');
  const [walletCreationType, setWalletCreationType] = useState<WalletCreationType>(
    WalletCreationType.PASSKEY,
  );
  const [creationCompleted, setCreationCompleted] = useState<boolean>(false);
  const { setUser, loginWithPasskey } = useAuth();

  const { isPasskeyAvailable, getNewUserPasskey } = usePasskey();

  // This screen is a spinner: a failure has to leave it. Sign-in picks up an
  // account that got as far as a global account.
  const giveUp = () => {
    toast.error(t('wallet.createFailed'));
    router.replace('/sign-in');
  };

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
      console.error(error);
      return {
        success: false,
      };
    }
  };

  const globalAccountSignupComplete = (walletAddress: `0x${string}`) => {
    onNext('wallet-creation', {
      email: email,
      address: walletAddress,
    });
  };

  const handleUserAlreadyHasGlobalAccount = async (email: string) => {
    try {
      setWalletCreationType(WalletCreationType.HAS_ACCOUNT);

      const userInformation = await getUserSubOrganization(email);
      if (!userInformation) {
        toast.error(t('wallet.createFailed'));
        return;
      }
      const { subOrganizationId, hasPasskey } = userInformation;

      setUser({
        email,
        subOrganizationId,
      });

      if (hasPasskey && isPasskeyAvailable) {
        setWalletCreationType(WalletCreationType.PASSKEY);
      } else {
        setWalletCreationType(WalletCreationType.NO_PASSKEY);
      }

      setCreationCompleted(true);
    } catch (error) {
      Sentry.captureException(error);
      console.error('Something went wrong while creating the user wallet', error);
      giveUp();
    }
  };

  const handleWalletCreation = async (email: string) => {
    try {
      const {
        success: withPasskey,
        encodedChallenge,
        attestation,
      } = await tryCreatePasskey(email);

      if (!withPasskey) {
        setWalletCreationType(WalletCreationType.NO_PASSKEY);
      }

      trackEvent('Account Creation', {
        distinct_id: email,
        withPasskey: withPasskey,
      });

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

      setCreationCompleted(true);
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error('Something went wrong while creating the user wallet', error);
      giveUp();
    }
  };

  const continueAfterCreation = async () => {
    if (walletCreationType === WalletCreationType.NO_PASSKEY) {
      setWalletCreationType(WalletCreationType.OTP);
      return;
    }

    try {
      const { success, newWalletAddress } = await loginWithPasskey({
        existOnDevConsole: false,
      });
      if (!success) return giveUp();
      globalAccountSignupComplete(newWalletAddress!);
    } catch (error) {
      if (explainSignUpRefusal(error, () => router.replace('/sign-in'), t)) {
        // Told why; still leave the spinner.
        router.replace('/sign-in');
        return;
      }
      Sentry.captureException(error);
      giveUp();
    }
  };

  useEffect(() => {
    if (!creationCompleted) return;
    void continueAfterCreation();
  }, [creationCompleted]);

  useEffect(() => {
    if (isNull(isPasskeyAvailable)) return;
    const email = searchParams.get('email');
    const hasGlobalAccount = searchParams.get('hasGlobalAccount');
    if (!email) {
      router.replace('/sign-in');
      return;
    }
    setEmail(email);
    if (hasGlobalAccount === 'true') {
      void handleUserAlreadyHasGlobalAccount(email);
      return;
    }
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
