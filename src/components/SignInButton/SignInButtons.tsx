import type { FC } from 'react';

import React from 'react';

import { SignInButton } from '@/components/SignInButton';
import { GitHubIcon, GoogleIcon } from '@/components/Icons';

interface SignInButtonProps {
  isSignIn: boolean;
}

export const SignInButtons: FC<SignInButtonProps> = ({ isSignIn }) => {
  const handlerGitHubLogin = (app: string) => {
    window.location.replace(
      `http://localhost:3000/api/auth/authorize?app=${app}`
    );
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
