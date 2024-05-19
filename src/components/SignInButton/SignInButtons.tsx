'use client';
import type { FC } from 'react';

import React, { useContext } from 'react';

import { SignInButton } from '@/components/SignInButton';
import { GitHubIcon, GoogleIcon } from '@/components/Icons';
import { frontendUrl } from '@/config/default';
import { NotificationContext } from '@/context/notificationContext';

interface SignInButtonProps {
  isSignIn: boolean;
  disabled: boolean;
}

export const SignInButtons: FC<SignInButtonProps> = ({
  isSignIn,
  disabled,
}) => {
  const { setNotification } = useContext(NotificationContext);
  const handlerLogin = (app: string) => {
    if (disabled)
      setNotification(
        'You must accept terms of service and privacy policy',
        'Terms of service',
        'error'
      );
    else window.location.replace(`${frontendUrl}api/auth/authorize?app=${app}`);
  };

  return (
    <>
      <SignInButton
        className="sm"
        isSignIn={isSignIn}
        Icon={GoogleIcon}
        onClick={() => handlerLogin('google')}
      />
      <SignInButton
        className="sm"
        isSignIn={isSignIn}
        Icon={GitHubIcon}
        onClick={() => handlerLogin('github')}
      />
    </>
  );
};

export default SignInButtons;
