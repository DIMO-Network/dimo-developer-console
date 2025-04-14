import { FC, useContext, useEffect } from 'react';
import { BubbleLoader } from '@/components/BubbleLoader';
import { usePasskey } from '@/hooks';
import { useSearchParams } from 'next/navigation';
import { NotificationContext } from '@/context/notificationContext';
import * as Sentry from '@sentry/nextjs';
import { EmbeddedKey, getFromLocalStorage } from '@/utils/localStorage';
import { getUserInformation, saveNewPasskey } from '@/actions/user';

import { getTurnkeyClient } from '@/services/turnkey';
import { gtSuper } from '@/utils/font';

interface IProps {
  onNext: (flow: string) => void;
}

export const RewirePasskey: FC<IProps> = ({ onNext }) => {
  const { setNotification } = useContext(NotificationContext);
  const params = useSearchParams();
  const { getNewUserPasskey } = usePasskey();

  const registerNewPasskey = async ({
    recoveryKey,
    email,
  }: {
    recoveryKey: string;
    email: string;
  }): Promise<void> => {
    const userInformation = await getUserInformation(email);
    const subOrganizationId = userInformation?.subOrganizationId;
    const ekey = getFromLocalStorage<string>(EmbeddedKey);

    const client = getTurnkeyClient({
      authKey: recoveryKey,
      eKey: ekey!,
    });

    const me = await client.getWhoami({ organizationId: subOrganizationId! });

    const { attestation, encodedChallenge } = await getNewUserPasskey(me!.username!);

    const { authenticators } = await client.getAuthenticators({
      organizationId: me!.organizationId,
      userId: me!.userId,
    });

    const signedRemoveAuthenticators = await client.stampDeleteAuthenticators({
      type: 'ACTIVITY_TYPE_DELETE_AUTHENTICATORS',
      timestampMs: Date.now().toString(),
      organizationId: me!.organizationId,
      parameters: {
        userId: me!.userId,
        authenticatorIds: authenticators!.map((auth) => auth.authenticatorId),
      },
    });

    const signedRecoverUser = await client.stampRecoverUser({
      type: 'ACTIVITY_TYPE_RECOVER_USER',
      timestampMs: Date.now().toString(),
      organizationId: me!.organizationId,
      parameters: {
        userId: me!.userId,
        authenticator: {
          authenticatorName: 'DIMO PASSKEY',
          challenge: encodedChallenge,
          attestation,
        },
      },
    });

    await saveNewPasskey({
      email: me!.username!,
      signedRecoveryRequest: signedRecoverUser,
      signedAuthenticatorRemoval: signedRemoveAuthenticators,
    });
  };

  const handleRewirePasskey = async ({
    recoveryKey,
    email,
  }: {
    recoveryKey: string;
    email: string;
  }) => {
    try {
      await registerNewPasskey({ recoveryKey, email });
      setNotification('Passkey rewired successfully', 'Success', 'success');
      onNext('rewire-passkey');
    } catch (error) {
      console.error('Error while rewiring passkey', error);
      setNotification('Something went wrong', 'Oops...', 'error');
      Sentry.captureException(error);
    }
  };

  useEffect(() => {
    const recoveryKey = params.get('token');
    const email = params.get('email');
    if (recoveryKey && email) {
      void handleRewirePasskey({ recoveryKey, email });
    }
  }, [params]);

  return (
    <div className="email-recovery__form">
      <div className="email-recovery__header">
        <p className={gtSuper.className}>Let&apos;s get you back in</p>
      </div>
      <div className="email-recovery__input">
        <p>A passkey is the fastest and most secure way to sign in to DIMO.</p>
        <BubbleLoader isLoading={true} />
        <p className="text-center text-xl">Rewriting your passkey...</p>
      </div>
    </div>
  );
};

export default RewirePasskey;
