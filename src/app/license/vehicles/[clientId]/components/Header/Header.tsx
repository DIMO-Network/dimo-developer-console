export const Header = (props: { tokenId: number; alias: string }) => {
  return (
    <div className={'flex flex-row items-center gap-2 pb-4'}>
      <div
        className={
          'flex h-6 min-w-6 items-center justify-center rounded-chip bg-control px-1.5'
        }
      >
        <p className={'text-label text-muted'}>{props.tokenId}</p>
      </div>
      <p className="text-body text-ink">{props.alias}</p>
    </div>
  );
};
