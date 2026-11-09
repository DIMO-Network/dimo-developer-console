'use client';
import type { FC } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Table } from '@/components/Table';
import type { IColumn } from '@/components/Table/Column';
import { StatusChip } from '@/components/StatusChip';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { actionableKeys, grantCandidates, memberLicenseKeys } from './memberKeys';
import { memberStatus } from './memberStatus';
import { RowActionsMenu, type RowAction } from '@/components/RowActionsMenu';
import type { Translate } from '@/i18n/translate';

export type MemberAction = 'grant' | 'revoke' | 'remove' | 'resend' | 'cancel';
export type MemberActionHandlers = Partial<
  Record<MemberAction, (member: TeamMember) => void>
>;

interface Props {
  members: TeamMember[];
  licenses: TeamLicense[];
  // The licenses loaded cleanly; until then no cell says what is on-chain.
  licensesReady?: boolean;
  isOwner: boolean;
  // Owner and flag on (C5).
  showDataAccess: boolean;
  handlers?: MemberActionHandlers;
}

export const displayName = (member: TeamMember) => member.name ?? member.email;

const NameCell = (member: TeamMember) => (
  <div className="flex flex-col">
    <span className="text-body-sm text-ink">{displayName(member)}</span>
    {member.name && (
      <span className="break-all text-label text-muted">{member.email}</span>
    )}
  </div>
);

const chip = 'rounded-chip bg-highest px-2 py-0.5 text-label text-muted';

interface CellText {
  t: Translate;
  tCommon: Translate;
  list: (names: string[]) => string;
}

const DataAccessCell = (
  member: TeamMember,
  licenses: TeamLicense[],
  ready: boolean,
  { t, tCommon, list }: CellText,
) => {
  if (member.role === 'OWNER')
    return <span className="text-body-sm text-muted">{tCommon('team.roles.OWNER')}</span>;
  if (!ready) return <span className="text-body-sm text-muted">—</span>;
  const keys = memberLicenseKeys(member, licenses).filter((k) => k.licenseKnown);
  const live = keys.filter((k) => k.onChain);
  // Spec: "Removed — still a signer on {licenses}" / "Left — still a signer".
  if (live.length && member.status !== 'ACCEPTED')
    return (
      <StatusChip tone="error">
        {t('members.dataAccess.stillSigner', {
          licenses: list([...new Set(live.map((k) => k.licenseLabel))]),
        })}
      </StatusChip>
    );
  if (live.length)
    return (
      <div className="flex flex-wrap gap-1">
        {live.map((k) => (
          <span key={`${k.tokenId}:${k.signer}`} className={chip}>
            {k.licenseLabel}
          </span>
        ))}
        {/* On-chain without a registry row: console-api answers NONE until it is recorded. */}
        {live.some((k) => !k.registered) && (
          <StatusChip tone="pending">{t('members.dataAccess.notRecorded')}</StatusChip>
        )}
      </div>
    );
  if (keys.some((k) => k.registered))
    return (
      <StatusChip tone="pending">{t('members.dataAccess.revokeUnfinished')}</StatusChip>
    );
  // Grant needs a verified wallet, which the member links by signing in once.
  if (member.status === 'ACCEPTED' && !member.signerAddress)
    return (
      <span className="text-body-sm text-muted">
        {t('members.dataAccess.needsSignIn')}
      </span>
    );
  return <span className="text-body-sm text-muted">{t('members.dataAccess.none')}</span>;
};

const actionsFor = (
  member: TeamMember,
  licenses: TeamLicense[],
  handlers: MemberActionHandlers,
  showDataAccess: boolean,
  t: Translate,
): RowAction[] => {
  if (member.role === 'OWNER') return [];
  const items: RowAction[] = [];
  const add = (action: MemberAction, label: string, destructive = false) => {
    const handler = handlers[action];
    if (handler) items.push({ label, destructive, onSelect: () => handler(member) });
  };
  // Labels as in the spec: Grant, Revoke, Remove, Resend, Cancel invite.
  if (member.status === 'PENDING') {
    add('resend', t('members.actions.resend'));
    add('cancel', t('members.actions.cancelInvite'), true);
    return items;
  }
  if (showDataAccess && grantCandidates(member, licenses).length)
    add('grant', t('members.actions.grant'));
  // Revoking stays available with the flag off: keys granted earlier still work.
  // A removed member's leftover keys read "Retry" (spec: "Removed — … Retry").
  if (actionableKeys(memberLicenseKeys(member, licenses)).length)
    add(
      'revoke',
      member.status === 'REVOKED'
        ? t('members.actions.retry')
        : t('members.actions.revoke'),
      true,
    );
  if (member.status === 'ACCEPTED') add('remove', t('members.actions.remove'), true);
  return items;
};

export const MembersTable: FC<Props> = ({
  members,
  licenses,
  licensesReady = true,
  isOwner,
  showDataAccess,
  handlers,
}) => {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const text: CellText = { t, tCommon, list: (names) => format.list(names) };
  const columns: IColumn[] = [
    { name: 'email', label: t('members.columns.member'), render: NameCell },
    {
      name: 'role',
      label: t('members.columns.role'),
      className: 'hidden md:table-cell',
      render: (m: TeamMember) => (
        <span className="text-body-sm text-fg">
          {tCommon(m.role === 'OWNER' ? 'team.roles.OWNER' : 'team.roles.MEMBER')}
        </span>
      ),
    },
    {
      name: 'status',
      label: t('members.columns.status'),
      render: (m: TeamMember) => {
        const { tone, labelKey } = memberStatus(m);
        return <StatusChip tone={tone}>{t(labelKey)}</StatusChip>;
      },
    },
    ...(showDataAccess
      ? [
          {
            name: 'memberKeys',
            label: t('members.columns.dataAccess'),
            className: 'hidden md:table-cell',
            render: (m: TeamMember) => DataAccessCell(m, licenses, licensesReady, text),
          },
        ]
      : []),
  ];
  const actions =
    isOwner && handlers
      ? [
          (m: TeamMember) => (
            <RowActionsMenu
              key={`actions-${m.id}`}
              label={t('members.actions.label', { email: m.email })}
              items={actionsFor(m, licenses, handlers, showDataAccess, t)}
            />
          ),
        ]
      : undefined;
  return <Table columns={columns} data={members} actions={actions} />;
};
