'use client';
import { signIn } from 'next-auth/react';
import Image from 'next/image';

import { Anchor } from '@/components/Anchor';
import { existUserEmailOrAddress } from '@/actions/user';
import { IAuth } from '@/types/auth';
import { SignInButtons } from '@/components/SignInButton';
import { useErrorHandler } from '@/hooks';
import { withNotifications } from '@/hoc';

import './View.css';
import { NotificationContext } from '@/context/notificationContext';
import { useContext, useEffect } from 'react';
import { useGlobalAccount } from '@/hooks';
import { useRouter } from 'next/navigation';

export const View = () => {
  useErrorHandler();
  const { setNotification } = useContext(NotificationContext);
  const router = useRouter();
  const { organizationInfo, loginAndRedirect } = useGlobalAccount();

  const notifyUnregisterUser = (type: string) => {
    setNotification(`The ${type} is not registered`, 'Not registered', 'error');
  };

  const handleCTA = async (app: string, auth?: Partial<IAuth>) => {
    if (app === 'credentials') {
      const { existItem } = await existUserEmailOrAddress(
        auth?.address ?? null,
        app
      );

      if (!existItem) {
        notifyUnregisterUser('address');
        return;
      }
    }
    await signIn(app, auth);
  };

  useEffect(() => {
    if (!organizationInfo) return;
    if (!organizationInfo.subOrganizationId) {
      router.push('/sign-up');
      return;
    }
    void loginAndRedirect();
  }, [organizationInfo]);

  return (
    <main className="sign-in">
      <div className="sign-in__content">
        <article className="sign-in__form">
          <section className="sign-in__header">
            <Image
              src={'/images/build-on-dimo.png'}
              alt="DIMO Logo"
              width={176}
              height={24}
            />
            <p>Welcome back!</p>
          </section>
          <section className="sign-in__buttons">
            <SignInButtons isSignIn={true} disabled={false} onCTA={handleCTA} />
          </section>
          <section className="sign-in__extra-links">
            <Anchor href="/sign-up" className="primary">
              Create an account
            </Anchor>
          </section>
        </article>
      </div>
    </main>
  );
};

export default withNotifications(View);
