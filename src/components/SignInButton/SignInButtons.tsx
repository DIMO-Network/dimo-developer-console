'use client';
import type { FC } from 'react';

import React from 'react';

import { SignInButton } from '@/components/SignInButton';
import { GitHubIcon, GoogleIcon } from '@/components/Icons';
import { frontendUrl } from '@/config/default';

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
