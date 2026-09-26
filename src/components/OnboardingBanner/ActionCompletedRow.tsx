import { CheckCircleIcon } from '@heroicons/react/16/solid';
import React, { FC } from 'react';

interface Props {
  text: string;
}
export const ActionCompletedRow: FC<Props> = ({ text }) => {
  return (
    <div className={'flex flex-row items-center gap-2.5'}>
      <CheckCircleIcon className="size-4 shrink-0 text-positive" />
      <p className={'text-body text-muted'}>{text}</p>
    </div>
  );
};
