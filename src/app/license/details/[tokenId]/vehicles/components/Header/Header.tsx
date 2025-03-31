export const Header = (props: { tokenId: number; alias: string }) => {
  return (
    <div
      className={'flex flex-row gap-2 items-center pb-6 border-b border-b-cta-default'}
    >
      <div
        className={
          'w-6 h-6 rounded-full bg-surface-raised flex justify-center items-center'
        }
      >
        <p className={'text-sm font-medium'}>{props.tokenId}</p>
      </div>
      <p className="text-base text-text-secondary">{props.alias}</p>
    </div>
  );
};
