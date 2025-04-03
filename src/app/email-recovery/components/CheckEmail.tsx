'use client';
import { FC } from 'react';
import { gtSuper } from '@/utils/font';
import { Button } from '@/components/Button';

interface IProps {}

export const CheckEmail: FC<IProps> = () => {
  return (
    <div className="email-recovery__form">
      <div className="email-recovery__header">
        <p className={gtSuper.className}>Click the link in your email</p>
      </div>
      <div className="email-recovery__input">
        <p>Not seeing an email? Check your spam folder or resend code.</p>
        <Button type="button" className="border invert border-white" role="cancel-button">
          Resend code
        </Button>
      </div>
    </div>
  );
};
