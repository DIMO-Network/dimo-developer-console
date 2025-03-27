import { FC } from 'react';
import { CopyButton, ICopyButtonProps } from '@/components/CopyButton/CopyButton';

interface IProps extends ICopyButtonProps {}

export const CopyableRow: FC<IProps> = ({ value, onCopySuccessMessage }) => {
  return (
    <div
      className={
        'flex flex-row gap-2.5 bg-surface-raised py-2 px-3 rounded-xl items-center'
      }
    >
      <p className={'text-sm text-text-secondary'}>{value}</p>
      <CopyButton value={value} onCopySuccessMessage={onCopySuccessMessage} />
    </div>
  );
};
