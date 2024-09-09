'use client';
import type { FC } from 'react';

import React, { useContext } from 'react';

import { GitHubIcon, GoogleIcon } from '@/components/Icons';
import { IAuth } from '@/types/auth';
import { NotificationContext } from '@/context/notificationContext';
import { SignInButton } from '@/components/SignInButton';
import { Siwe } from '@/components/Siwe';

interface SignInButtonProps {
  isSignIn: boolean;
  disabled: boolean;
  onCTA: (a: string, d?: Partial<IAuth>) => void;
}

export const SignInButtons: FC<SignInButtonProps> = ({
  isSignIn,
  disabled,
  onCTA,
}) => {
  const { setNotification } = useContext(NotificationContext);
  
  const handlerLogin = (app: string, auth?: Partial<IAuth>) => {
    if (disabled)
      setNotification(
        'You must accept terms of service and privacy policy',
        'Terms of service',
        'error'
      );
    else onCTA(app, auth);
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
