import { useContext } from 'react';
import { NotificationContext } from '@/context/notificationContext';
import { ContentCopyIcon } from '@/components/Icons';

export const ClientId = (props: { value: string }) => {
  const { setNotification } = useContext(NotificationContext);
  const handleCopy = () => {
    void navigator.clipboard.writeText(props.value);
    setNotification('Client ID copied!', 'Success', 'info');
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2">
      <p className="text-base text-text-secondary font-medium">Client ID</p>
      <div
        className={
          'flex flex-row gap-2.5 bg-surface-raised py-2 px-3 rounded-xl items-center'
        }
      >
        <p className={'text-base text-text-secondary'}>{props.value}</p>
        <ContentCopyIcon
          className="w5 h-5 fill-white/50 cursor-pointer"
          onClick={handleCopy}
        />
      </div>
    </div>
  );
};
