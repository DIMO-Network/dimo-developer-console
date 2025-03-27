import {CopyableRow} from "@/components/CopyableRow";

export const ClientId = (props: { value: string }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-2">
      <p className="text-base text-text-secondary font-medium">Client ID</p>
      <CopyableRow value={props.value} onCopySuccessMessage={'Client ID Copied!'} />
    </div>
  );
};
