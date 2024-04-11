import type { FC } from 'react';

import React from 'react';
import classnames from 'classnames';

import { Button } from '@/components/Button';
import { IconProps } from '@/components/Icons';
import './SignInButton.css';

interface SignInButtonProps {
  className: string;
  isSignIn: boolean;
  Icon: FC<IconProps>;
}

export const SignInButton: FC<SignInButtonProps> = ({
  isSignIn,
  Icon,
  className: inputClassName = '',
}) => {
  const buttonText = isSignIn ? 'Sign In' : 'Sign Up';
  const className = classnames('icon', inputClassName);

  return (
    <Button type="button" className="dark" role={'sign-in-button'}>
      <Icon className={className} />
      {buttonText}
    </Button>
  );
};

export default SignInButton;
