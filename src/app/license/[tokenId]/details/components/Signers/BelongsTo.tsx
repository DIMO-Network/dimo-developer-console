import type { FC } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { StatusChip } from '@/components/StatusChip';
import type { LicenseSignerRecord } from '@/types/team';

interface Props {
  record?: LicenseSignerRecord;
  // A verified wallet of the team with no registry row: the owner's console
  // wallet, or a member's wallet whose grant wasn't recorded (Grant in Settings
  // → Team records it). Assign never may (C7).
  memberWallet?: { name: string; email: string; owner: boolean };
  // The owner's console key: access to this license for the console itself.
  consoleKey?: boolean;
  // A registry row whose signer the chain no longer lists.
  offChain?: boolean;
  // An off-chain row recorded moments ago: Identity hasn't indexed the key yet.
  syncing?: boolean;
  unavailable?: boolean;
  onAssign?: () => void;
}

export const BelongsTo: FC<Props> = ({
  record,
  memberWallet,
  consoleKey = false,
  offChain = false,
  syncing = false,
  unavailable = false,
  onAssign,
}) => {
  const t = useTranslations('license');
  const format = useFormatter();
  if (unavailable) return <span className="text-body-sm text-muted">—</span>;
  let body;
  if (consoleKey) {
    body = <span className="text-body-sm text-fg">{t('belongsTo.consoleYou')}</span>;
  } else if (!record && memberWallet) {
    body = (
      <div className="flex flex-col items-start gap-1">
        <span className="text-body-sm text-fg">{memberWallet.name}</span>
        <span className="break-all text-label text-muted">{memberWallet.email}</span>
        {memberWallet.owner ? (
          <span className="rounded-chip bg-highest px-2 py-0.5 text-label text-muted">
            {t('belongsTo.consoleWallet')}
          </span>
        ) : (
          <StatusChip tone="pending">{t('belongsTo.notRecorded')}</StatusChip>
        )}
      </div>
    );
  } else if (!record) {
    body = (
      <span className="text-body-sm text-muted">
        {t('belongsTo.unassigned')}
        {onAssign && (
          <>
            {' · '}
            <button type="button" className="text-ink underline" onClick={onAssign}>
              {t('belongsTo.assign')}
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
          {holder?.name ?? holder?.email ?? t('belongsTo.teamMember')}
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
          {format.list(
            record.holders.map((h) => h.name ?? h.email ?? t('belongsTo.unknown')),
          )}
        </span>
        {record.note && <span className="text-label text-muted">{record.note}</span>}
      </div>
    );
  }
  if (!offChain) return body;
  return (
    <div className="flex flex-col items-start gap-1">
      {body}
      {syncing ? (
        <StatusChip tone="pending">{t('belongsTo.stillSyncing')}</StatusChip>
      ) : (
        <StatusChip tone="off">{t('belongsTo.disabledOutside')}</StatusChip>
      )}
    </div>
  );
};
