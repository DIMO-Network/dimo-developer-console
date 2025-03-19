import { CheckCircleIcon } from '@heroicons/react/16/solid';
import React, { FC } from 'react';

interface Props {
  text: string;
}
export const ActionCompletedRow: FC<Props> = ({ text }) => {
  return (
    <div className={'flex flex-row items-center gap-2'}>
      <CheckCircleIcon className="size-4 text-feedback-success" />
      <p className={'text-base text-white'}>{text}</p>
    </div>
  );
};
