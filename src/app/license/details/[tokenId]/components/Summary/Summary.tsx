import {FragmentType, useFragment} from "@/gql";
import {DEVELOPER_LICENSE_SUMMARY_FRAGMENT} from "@/components/LicenseCard";
import {FC, useState} from "react";
import {checkIsLicenseOwner} from "@/utils/sessionStorage";
import {WorkspaceNameModal} from "@/components/WorkspaceNameModal";
import {AliasAndTokenId} from "@/app/license/details/[tokenId]/components/Summary/components/AliasAndTokenId";
import {ClientId} from "@/app/license/details/[tokenId]/components/Summary/components/ClientId";

interface Props {
  licenseSummary: FragmentType<typeof DEVELOPER_LICENSE_SUMMARY_FRAGMENT>
  refetch: () => void;
}

export const Summary: FC<Props> = ({ licenseSummary, refetch }) => {
  const license = useFragment(DEVELOPER_LICENSE_SUMMARY_FRAGMENT, licenseSummary);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleEditClick = () => {
    setIsEditModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <AliasAndTokenId
        tokenId={license.tokenId}
        alias={license.alias}
        canEdit={checkIsLicenseOwner(license)}
        onEdit={handleEditClick}
      />
      <ClientId value={license.clientId} />
      <WorkspaceNameModal
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        license={license}
        onSuccess={refetch}
      />
    </div>
  );
};

