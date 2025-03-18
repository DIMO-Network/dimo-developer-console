'use client';
import { ReactNode, useContext, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { setCookie } from 'cookies-next/client';

import Image from 'next/image';

import { Anchor } from '@/components/Anchor';
import { IAuth } from '@/types/auth';
import { useAuth, useErrorHandler, usePasskey } from '@/hooks';
import { withNotifications } from '@/hoc';
import { NotificationContext } from '@/context/notificationContext';

import './View.css';
import * as Sentry from '@sentry/nextjs';
import { OtpInputForm, PasskeyLogin, SignInMethodForm } from '@/app/sign-in/components';
import { getUserInformation } from '@/actions/user';
import { isCollaborator } from '@/utils/user';

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
}: {
  type: SignInType;
  handleLogin: (email: string) => Promise<void>;
  handleCTA: (app: string, auth?: Partial<IAuth>) => Promise<void>;
  handlePasskeyRejected: () => void;
}): ReactNode => {
  switch (type) {
    case SignInType.OTP:
      return <OtpInputForm />;
    case SignInType.PASSKEY:
      return <PasskeyLogin handlePasskeyRejected={handlePasskeyRejected} />;
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

  const [signInType, setSignInType] = useState<SignInType>(SignInType.NONE);

  const handleCTA = async (app: string, auth?: Partial<IAuth>) => {
    //await signIn(app, auth);
    await handleExternalAuth(app);
  };

  const handleLogin = async (email: string) => {
    try {
      const userInformation = await getUserInformation(email);

      if (!userInformation) {
        router.push(`/sign-up?email=${email}`);
        return;
      }

      const { role, subOrganizationId, hasPasskey } = userInformation;

      if (isCollaborator(role)) {
        router.push('/app');
        return;
      }

      setUser({
        subOrganizationId: subOrganizationId,
        email: email,
      });

      if (hasPasskey && isPasskeyAvailable) {
        setSignInType(SignInType.PASSKEY);
      } else {
        setSignInType(SignInType.OTP);
      }
    } catch (error) {
      Sentry.captureException(error);
      setNotification('Something went wrong please try again', 'Oops', 'error');
    }
  };

  const handlePasskeyRejected = () => {
    setSignInType(SignInType.OTP);
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
        <img src={'/images/dimo-dev.svg'} alt="DIMO Logo" />
        <SignInForm
          type={signInType}
          handleCTA={handleCTA}
          handleLogin={handleLogin}
          handlePasskeyRejected={handlePasskeyRejected}
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
        <img src={'/images/car_segment.svg'} alt="DIMO Background" />
      </div>
    </main>
  );
};

export default withNotifications(View);
