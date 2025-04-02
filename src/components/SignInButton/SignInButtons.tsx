'use client';
import type { FC } from 'react';

import React, { useContext } from 'react';

import { GitHubIcon, GoogleIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';
import { SignInButton } from '@/components/SignInButton';
import AppleIcon from '../Icons/AppleIcon';

interface SignInButtonProps {
  disabled: boolean;
  onCTA: (a: string) => void;
}

export const SignInButtons: FC<SignInButtonProps> = ({ disabled, onCTA }) => {
  const { setNotification } = useContext(NotificationContext);

  const handlerLogin = (app: string) => {
    if (disabled)
      setNotification(
        'You must accept terms of service and privacy policy',
        'Terms of service',
        'error',
      );
    else onCTA(app);
  };

  return (
    <>
      <SignInButton
        className="sm"
        Icon={GoogleIcon}
        onClick={() => handlerLogin('google')}
      />
      <SignInButton
        className="sm"
        Icon={AppleIcon}
        onClick={() => handlerLogin('apple')}
      />
      <SignInButton
        className="sm"
        Icon={GitHubIcon}
        onClick={() => handlerLogin('github')}
      />
    </>
  );
};

export default SignInButtons;
