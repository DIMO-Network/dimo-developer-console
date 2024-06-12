'use client';
import type { FC } from 'react';

import React from 'react';

import { SignInButton } from '@/components/SignInButton';
import { GitHubIcon, GoogleIcon } from '@/components/Icons';
import { frontendUrl } from '@/config/default';
import { Siwe } from '../Siwe';

interface SignInButtonProps {
  isSignIn: boolean;
}

export const SignInButtons: FC<SignInButtonProps> = ({ isSignIn }) => {
  const handlerGitHubLogin = (app: string) => {
    window.location.replace(`${frontendUrl}api/auth/authorize?app=${app}`);
  };

  return (
    <>
      <SignInButton
        className="sm"
        isSignIn={isSignIn}
        Icon={GoogleIcon}
        onClick={() => handlerGitHubLogin('google')}
      />
      <Siwe isSignIn={isSignIn} />
      <SignInButton
        className="sm"
        isSignIn={isSignIn}
        Icon={GitHubIcon}
        onClick={() => handlerGitHubLogin('github')}
      />
    </>
  );
};

export default SignInButtons;
