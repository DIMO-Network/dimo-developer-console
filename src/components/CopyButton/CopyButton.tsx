import { CheckIcon } from '@heroicons/react/16/solid';
import { ContentCopyIcon } from '@/components/Icons';
import { FC, useState } from 'react';
import { toast } from 'sonner';
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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    try {
      void navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(onCopySuccessMessage ?? 'Value copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy value');
      console.error('failed to copy', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
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
