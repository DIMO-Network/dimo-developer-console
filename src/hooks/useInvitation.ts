'use client';

import { useContext, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { NotificationContext } from '@/context/notificationContext';
import { checkMyInvitation } from '@/services/invitation';

export const useInvitation = () => {
  const [isValid, setIsValid] = useState<boolean>();
  const { setNotification } = useContext(NotificationContext);
  const searchParams = useSearchParams();
  const invitationCode = searchParams.get('invitation') ?? null;

  useEffect(() => {
    if (invitationCode) {
      checkMyInvitation(invitationCode)
        .then(() => {
          setIsValid(true);
        })
        .catch((error) => {
          setIsValid(false);
          setNotification(error?.message ?? '', 'Oops...', 'error');
        });
    }
  }, [invitationCode]);

  return { isValid, invitationCode };
};

export default useInvitation;
