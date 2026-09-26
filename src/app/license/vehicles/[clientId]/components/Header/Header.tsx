export const Header = (props: { tokenId: number; alias: string }) => {
  return (
    <div className={'flex flex-row gap-2 items-center pb-6 border-b border-outline'}>
      <div className={'w-6 h-6 rounded-full bg-card flex justify-center items-center'}>
        <p className={'text-body-sm font-medium text-ink'}>{props.tokenId}</p>
      </div>
      <p className="text-body-sm text-muted">{props.alias}</p>
    </div>
  );
};
