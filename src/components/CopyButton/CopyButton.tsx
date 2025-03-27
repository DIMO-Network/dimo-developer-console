import { CheckIcon } from '@heroicons/react/16/solid';
import { ContentCopyIcon } from '@/components/Icons';
import { FC, useContext, useState } from 'react';
import { NotificationContext } from '@/context/notificationContext';
import classnames from 'classnames';

export interface ICopyButtonProps {
  value: string;
  onCopySuccessMessage?: string;
  className?: string;
}

export const CopyButton: FC<ICopyButtonProps> = ({
  value,
  onCopySuccessMessage,
  className = '',
}) => {
  const { setNotification } = useContext(NotificationContext);
  const [copied, setCopied] = useState(false);

  const handleCopy = (copiedValue: string) => {
    try {
      void navigator.clipboard.writeText(copiedValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setNotification(
        onCopySuccessMessage ?? 'Value copied to clipboard',
        'Success',
        'success',
        1000,
      );
    } catch (err) {
      console.log('failed to copy');
    }
  };

  return (
    <button
      onClick={() => handleCopy(value)}
      className={classnames(className, 'transition')}
      disabled={copied}
    >
      {copied ? (
        <CheckIcon className={'w-5 h-5 transition'} />
      ) : (
        <ContentCopyIcon className="w-5 h-5 fill-white/50 cursor-pointer transition" />
      )}
    </button>
  );
};
