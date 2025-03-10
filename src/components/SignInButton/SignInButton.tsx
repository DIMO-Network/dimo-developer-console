import type { FC, MouseEvent } from 'react';

import React from 'react';
import classnames from 'classnames';

import { Button } from '@/components/Button';
import { IconProps } from '@/components/Icons';
import './SignInButton.css';

interface SignInButtonProps {
  className: string;
  isSignIn: boolean;
  Icon: FC<IconProps>;
  onClick: (e: MouseEvent<HTMLElement>) => void;
}

export const SignInButton: FC<SignInButtonProps> = ({
  isSignIn,
  Icon,
  className: inputClassName = '',
  onClick,
}) => {
  const className = classnames('icon', inputClassName);

  return (
    <Button
      type="button"
      className="sign-in-button dark"
      role={'sign-in-button'}
      onClick={onClick}
    >
      <Icon className={className} />      
    </Button>
  );
};

export default SignInButton;
