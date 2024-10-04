'use client';
import { FC } from 'react';
import { CheckIcon, ClickIcon } from '@/components/Icons';

interface IProps {}

export const CheckEmail: FC<IProps> = ({}) => {
  return (
    <div className="text-left text-xl gap-8 mt-4">
      <h1>Not seeing an email? Check your spam folder or</h1>
      <h1>resend code</h1>
      <div className="email-recovery__timeline">
        <div className="time-line"></div>
        <div className="steps">
          <div className="step">
            <div className="step-icon">
              <CheckIcon />
            </div>
            <p>Email sent</p>
          </div>
          <div className="step">
            <div className="step-icon">
              <ClickIcon />
            </div>
            <p>Click link to confirm</p>
          </div>
        </div>
      </div>
    </div>
  );
};
