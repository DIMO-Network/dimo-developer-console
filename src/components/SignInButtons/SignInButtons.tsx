import type { FC } from 'react';

import React from 'react';

import { Button } from '@/components/Button';
import { GitHubIcon, GoogleIcon } from '@/components/Icons';
import './SignInButtons.css';

interface SignInButtonsProps {
  isSignIn: boolean;
}

export const SignInButtons: FC<SignInButtonsProps> = ({ isSignIn }) => {
  const buttonText = isSignIn ? 'Sign In' : 'Sign Up';
  return (
    <div className="sign-in__buttons">
      <Button type="submit" className="dark">
        <GitHubIcon className="h-6 w-6 mr-1" />
        {buttonText}
      </Button>
      <Button type="submit" className="dark">
        <GoogleIcon className="h-6 w-6 mr-1" />
        {buttonText}
      </Button>
    </div>
  );
};

export default SignInButtons;
