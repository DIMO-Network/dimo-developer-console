'use client';
import { useTranslations } from 'next-intl';
import type { FC } from 'react';

import React from 'react';

import { GitHubIcon, GoogleIcon } from '@/components/Icons';
import { toast } from 'sonner';
import { SignInButton } from '@/components/SignInButton';
import AppleIcon from '../Icons/AppleIcon';

interface SignInButtonProps {
  disabled: boolean;
  onCTA: (a: string) => void;
}

export const SignInButtons: FC<SignInButtonProps> = ({ disabled, onCTA }) => {
  const t = useTranslations('common');
  const handlerLogin = (app: string) => {
    if (disabled) toast.error(t('signIn.acceptTerms'));
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
