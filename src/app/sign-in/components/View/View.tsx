'use client';
import { ReactNode, useContext, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setCookie } from 'cookies-next/client';
import { Anchor } from '@/components/Anchor';
import { IAuth } from '@/types/auth';
import { useAuth, useErrorHandler, usePasskey } from '@/hooks';
import { withNotifications } from '@/hoc';
import { NotificationContext } from '@/context/notificationContext';
import Image from 'next/image';

import './View.css';
import * as Sentry from '@sentry/nextjs';
import { OtpInputForm, PasskeyLogin, SignInMethodForm } from '@/app/sign-in/components';
import { getUserInformation } from '@/actions/user';
import { isCollaborator } from '@/utils/user';
import { isNull } from 'lodash';

enum SignInType {
  NONE = 'none',
  OTP = 'otp',
  PASSKEY = 'passkey',
}

const SignInForm = ({
  type,
  handleLogin,
  handleCTA,
  handlePasskeyRejected,
  currentEmail,
  currentWallet,
}: {
  type: SignInType;
  handleLogin: (email: string) => Promise<void>;
  handleCTA: (app: string, auth?: Partial<IAuth>) => Promise<void>;
  handlePasskeyRejected: () => void;
  currentEmail: string;
  currentWallet: `0x${string}` | null;
}): ReactNode => {
  switch (type) {
    case SignInType.OTP:
      return <OtpInputForm currentEmail={currentEmail} currentWallet={currentWallet} />;
    case SignInType.PASSKEY:
      return (
        <PasskeyLogin
          handlePasskeyRejected={handlePasskeyRejected}
          currentWallet={currentWallet}
        />
      );
    default:
      return <SignInMethodForm handleCTA={handleCTA} handleLogin={handleLogin} />;
  }
};

export const View = () => {
  useErrorHandler();
  const { setNotification } = useContext(NotificationContext);
  const { setUser, handleExternalAuth } = useAuth();
  const { isPasskeyAvailable } = usePasskey();
  const searchParams = useSearchParams();
  const router = useRouter();
  const invitationCode = searchParams.get('code') ?? '';
  if (invitationCode) {
    setCookie('invitation_code', invitationCode, {
      maxAge: 60 * 60,
    });
  }

  const [signInProcess, setSignInProcess] = useState<{
    email: string;
    signInType: SignInType;
    currentWallet: `0x${string}` | null;
  }>({
    email: '',
    signInType: SignInType.NONE,
    currentWallet: null,
  });

  const handleCTA = async (app: string, auth?: Partial<IAuth>) => {
    //await signIn(app, auth);
    console.info('handleCTA', app, auth);
    handleExternalAuth(app);
  };

  const handleLogin = async (email: string) => {
    try {
      const userInformation = await getUserInformation(email);

      if (!userInformation) {
        router.push(`/sign-up?email=${email}`);
        return;
      }

      const { role, subOrganizationId, hasPasskey, currentWalletAddress } =
        userInformation;

      if (isCollaborator(role)) {
        router.push('/app');
        return;
      }

      setUser({
        subOrganizationId: subOrganizationId,
        email: email,
      });

      if (hasPasskey && !isNull(isPasskeyAvailable) && isPasskeyAvailable) {
        setSignInProcess({
          email: email,
          signInType: SignInType.PASSKEY,
          currentWallet: currentWalletAddress,
        });
      } else {
        setSignInProcess({
          email: email,
          signInType: SignInType.OTP,
          currentWallet: currentWalletAddress,
        });
      }
    } catch (error) {
      Sentry.captureException(error);
      setNotification('Something went wrong please try again', 'Oops', 'error');
    }
  };

  const handlePasskeyRejected = () => {
    setSignInProcess((signInProcess) => ({
      ...signInProcess,
      signInType: SignInType.OTP,
    }));
  };

  // useEffect(() => {
  //   if (!session) return;
  //   if (isCollaborator(session.user.role)) {
  //     router.push('/app');
  //   } else {
  //     void handleLogin(session.user.email!);
  //   }
  // }, [session]);

  return (
    <main className="sign-in">
      <div className="sign-in__content">
        <Image src={'/images/dimo-dev.svg'} alt="DIMO Logo" width={210} height={32} />
        <SignInForm
          currentEmail={signInProcess.email}
          type={signInProcess.signInType}
          handleCTA={handleCTA}
          handleLogin={handleLogin}
          handlePasskeyRejected={handlePasskeyRejected}
          currentWallet={signInProcess.currentWallet}
        />
        <div className="sign-in__extra-links mt-6">
          <div className="flex flex-row">
            <p className="terms-caption">
              By signing in, you are agreeing to our{' '}
              <Anchor
                href="https://docs.dimo.zone/dinc/developer-terms-of-service"
                className="grey underline"
                target="_blank"
              >
                terms of service
              </Anchor>{' '}
              and{' '}
              <Anchor
                href="https://dimo.zone/legal/privacy-policy"
                className="grey underline"
                target="_blank"
              >
                privacy policy
              </Anchor>
            </p>
          </div>
        </div>
      </div>
      <div className="sign-in__background">
        <Image
          src={'/images/car_segment.svg'}
          alt="DIMO Background"
          width="684"
          height="832"
        />
      </div>
    </main>
  );
};

export default withNotifications(View);
