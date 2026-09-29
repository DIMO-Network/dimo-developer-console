import { CheckIcon } from '@heroicons/react/16/solid';
import { ContentCopyIcon } from '@/components/Icons';
import { FC, useContext, useState } from 'react';
import { NotificationContext } from '@/context/notificationContext';
import classnames from 'classnames';

import './CopyButton.css';

export interface ICopyButtonProps {
  value: string;
  onCopySuccessMessage?: string;
  className?: string;
  // inline: a bare icon (default). icon: a 32px round icon button.
  size?: 'inline' | 'icon';
}

export const CopyButton: FC<ICopyButtonProps> = ({
  value,
  onCopySuccessMessage,
  className = '',
  size = 'inline',
}) => {
  const { setNotification } = useContext(NotificationContext);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      void navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      setNotification(
        onCopySuccessMessage ?? 'Value copied to clipboard',
        'Success',
        'success',
        1000,
      );
    } catch (err) {
      setNotification('Failed to copy value', 'Error', 'error', 1000);
      console.error('failed to copy', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={classnames(
        'copy-button',
        size === 'icon' && 'icon',
        className,
        'transition',
      )}
      disabled={copied}
    >
      {copied ? (
        <CheckIcon className={'w-5 h-5 transition text-positive'} />
      ) : (
        <ContentCopyIcon className="w-5 h-5 cursor-pointer transition text-muted hover:text-ink" />
      )}
    </button>
  );
};
