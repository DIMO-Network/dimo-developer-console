import type { FC } from 'react';
import { StatusChip } from '@/components/StatusChip';
import { formatList } from '@/config/teamCopy';
import type { LicenseSignerRecord } from '@/types/team';

interface Props {
  record?: LicenseSignerRecord;
  // A verified wallet of the team with no registry row: the owner's console
  // wallet, or a member's wallet whose grant wasn't recorded (Grant in Settings
  // → Team records it). Assign never may (C7).
  memberWallet?: { name: string; email: string; owner: boolean };
  // A registry row whose signer the chain no longer lists.
  offChain?: boolean;
  unavailable?: boolean;
  onAssign?: () => void;
}

export const BelongsTo: FC<Props> = ({
  record,
  memberWallet,
  offChain = false,
  unavailable = false,
  onAssign,
}) => {
  if (unavailable) return <span className="text-body-sm text-muted">—</span>;
  let body;
  if (!record && memberWallet) {
    body = (
      <div className="flex flex-col items-start gap-1">
        <span className="text-body-sm text-fg">{memberWallet.name}</span>
        <span className="break-all text-label text-muted">{memberWallet.email}</span>
        {memberWallet.owner ? (
          <span className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
            Console wallet
          </span>
        ) : (
          <StatusChip tone="pending">Not recorded</StatusChip>
        )}
      </div>
    );
  } else if (!record) {
    body = (
      <span className="text-body-sm text-muted">
        Unassigned
        {onAssign && (
          <>
            {' · '}
            <button type="button" className="text-ink underline" onClick={onAssign}>
              Assign
            </button>
          </>
        )}
      </span>
    );
  } else if (record.kind === 'MEMBER') {
    const holder = record.holders[0];
    body = (
      <div className="flex flex-col">
        <span className="text-body-sm text-fg">
          {holder?.name ?? holder?.email ?? 'Team member'}
        </span>
        {holder?.email && (
          <span className="break-all text-label text-muted">{holder.email}</span>
        )}
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col">
        <span className="text-body-sm text-fg">
          {formatList(record.holders.map((h) => h.name ?? h.email ?? 'Unknown'))}
        </span>
        {record.note && <span className="text-label text-muted">{record.note}</span>}
      </div>
    );
  }
  if (!offChain) return body;
  return (
    <div className="flex flex-col items-start gap-1">
      {body}
      <StatusChip tone="off">Disabled outside the console</StatusChip>
    </div>
  );
};
