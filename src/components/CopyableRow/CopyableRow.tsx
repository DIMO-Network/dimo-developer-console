import { FC } from 'react';
import { CopyButton, ICopyButtonProps } from '@/components/CopyButton/CopyButton';

import './CopyableRow.css';

interface IProps extends ICopyButtonProps {
  displayText?: string;
}

export const CopyableRow: FC<IProps> = ({ value, onCopySuccessMessage, displayText }) => {
  return (
    <div
      className={
        'copyable-row'
      }
    >
      <p className={'text-sm text-text-secondary'}>{displayText ?? value}</p>
      <CopyButton value={value} onCopySuccessMessage={onCopySuccessMessage} />
    </div>
  );
};
