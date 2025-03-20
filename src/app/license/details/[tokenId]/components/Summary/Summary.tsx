import {Title} from "@/components/Title";
import {PencilIcon} from "@heroicons/react/16/solid";
import {ContentCopyIcon} from "@/components/Icons";
import {FragmentType, useFragment} from "@/gql";
import {DEVELOPER_LICENSE_SUMMARY_FRAGMENT} from "@/components/LicenseCard";
import {FC, useContext} from "react";

import {NotificationContext} from "@/context/notificationContext";

interface Props {
  licenseSummary: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT>
}

export const Summary: FC<Props> = ({ licenseSummary }) => {
  const license = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, licenseSummary);
  const { setNotification } = useContext(NotificationContext);

  const handleEditClick = () => {

  };

  const handleCopy = () => {
    void navigator.clipboard.writeText(license.clientId);
    setNotification('Client ID copied!', 'Success', 'info');
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row gap-2 items-center">
        <div className={"w-6 h-6 rounded-full bg-surface-raised flex justify-center items-center"}>
          <p className={"text-sm font-medium"}>{license.tokenId}</p>
        </div>
        <Title className="text-xl">
          {license.alias}
        </Title>
        <PencilIcon className="w-4 h-4 cursor-pointer text-text-secondary" onClick={handleEditClick}/>
      </div>
      <div className="flex flex-col md:flex-row md:items-center gap-2">
        <p className="text-base text-text-secondary font-medium">
          Client ID
        </p>
        <div className={"flex flex-row gap-2.5 bg-surface-raised py-2 px-3 rounded-xl items-center"}>
          <p className={"text-base text-text-secondary"}>{license.clientId}</p>
          <ContentCopyIcon
            className="w5 h-5 fill-white/50 cursor-pointer"
            onClick={handleCopy}
          />
        </div>
      </div>
    </div>
  );
};
