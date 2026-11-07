import { useTranslations } from 'next-intl';
import { CheckIcon } from '@heroicons/react/16/solid';
import { ContentCopyIcon } from '@/components/Icons';
import { FC, useState } from 'react';
import { toast } from 'sonner';
import classnames from 'classnames';

import './CopyButton.css';

export interface ICopyButtonProps {
  value: string;
  onCopySuccessMessage?: string;
  // inline: a bare icon (default). icon: a 32px round icon button.
  size?: 'inline' | 'icon';
  ariaLabel?: string;
  className?: string;
}

export const CopyButton: FC<ICopyButtonProps> = ({
  value,
  onCopySuccessMessage,
  className = '',
  size = 'inline',
  ariaLabel,
}) => {
  const t = useTranslations('common');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      void navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(onCopySuccessMessage ?? t('copyButton.copied'));
    } catch (err) {
      toast.error(t('copyButton.failed'));
      console.error('failed to copy', err);
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? t('actions.copy')}
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
