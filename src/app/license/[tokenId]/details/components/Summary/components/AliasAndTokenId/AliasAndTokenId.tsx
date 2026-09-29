import { Title } from '@/components/Title';
import { PencilIcon } from '@heroicons/react/16/solid';

export const AliasAndTokenId = (props: {
  tokenId: number;
  alias?: string | null;
  canEdit: boolean;
  onEdit?: () => void;
}) => {
  return (
    <div className="flex flex-row gap-2 items-center">
      <div className={'w-6 h-6 rounded-full bg-card flex justify-center items-center'}>
        <p className={'text-body-sm font-medium text-ink'}>{props.tokenId}</p>
      </div>
      <Title className="text-title">{props.alias}</Title>
      {props.canEdit && (
        <PencilIcon
          className="w-4 h-4 cursor-pointer text-muted"
          onClick={props.onEdit}
        />
      )}
    </div>
  );
};
