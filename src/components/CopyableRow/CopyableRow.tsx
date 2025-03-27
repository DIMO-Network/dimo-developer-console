import {FC, useContext} from 'react';
import {TextField} from "@/components/TextField";
import {ContentCopyIcon} from "@/components/Icons";
import {NotificationContext} from "@/context/notificationContext";

interface IProps {
  value: string;
  onCopySuccessMessage?: string;
  name: string;
}

export const CopyableRow: FC<IProps> = ({ value, onCopySuccessMessage, name }) => {
  const { setNotification } = useContext(NotificationContext);

  const handleCopy = (copiedValue: string) => {
    void navigator.clipboard.writeText(copiedValue);
    setNotification(onCopySuccessMessage ?? 'Value copied to clipboard', 'Success', 'success', 1000);
  };

  return (
    <TextField
      name={name}
      type="text"
      readOnly={true}
      value={value}
      action={
        <ContentCopyIcon
          className="w5 h-5 fill-white/50 cursor-pointer"
          onClick={() => handleCopy(value)}
        />
      }
    />
  );
};
