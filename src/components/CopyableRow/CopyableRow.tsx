import { FC, useContext } from 'react';
import { ContentCopyIcon } from '@/components/Icons';
import { NotificationContext } from '@/context/notificationContext';

interface IProps {
  value: string;
  onCopySuccessMessage?: string;
}

export const CopyableRow: FC<IProps> = ({ value, onCopySuccessMessage }) => {
  const { setNotification } = useContext(NotificationContext);

  const handleCopy = (copiedValue: string) => {
    void navigator.clipboard.writeText(copiedValue);
    setNotification(
      onCopySuccessMessage ?? 'Value copied to clipboard',
      'Success',
      'success',
      1000,
    );
  };

  return (
    <div
      className={
        'flex flex-row gap-2.5 bg-surface-raised py-2 px-3 rounded-xl items-center'
      }
    >
      <p className={'text-sm text-text-secondary'}>{value}</p>
      <ContentCopyIcon
        className="w5 h-5 fill-white/50 cursor-pointer"
        onClick={() => handleCopy(value)}
      />
    </div>
  );
};
