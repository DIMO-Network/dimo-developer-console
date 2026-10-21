'use client';
import type { FC } from 'react';
import { Table } from '@/components/Table';
import type { IColumn } from '@/components/Table/Column';
import { StatusChip } from '@/components/StatusChip';
import { formatList } from '@/config/teamCopy';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { actionableKeys, grantCandidates, memberLicenseKeys } from './memberKeys';
import { memberStatus } from './memberStatus';
import { RowActionsMenu, type RowAction } from '@/components/RowActionsMenu';

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

const DataAccessCell = (member: TeamMember, licenses: TeamLicense[], ready: boolean) => {
  if (member.role === 'OWNER')
    return <span className="text-body-sm text-muted">Owner</span>;
  if (!ready) return <span className="text-body-sm text-muted">—</span>;
  const keys = memberLicenseKeys(member, licenses).filter((k) => k.licenseKnown);
  const live = keys.filter((k) => k.onChain);
  // Spec: "Removed — still a signer on {licenses}" / "Left — still a signer".
  if (live.length && member.status !== 'ACCEPTED')
    return (
      <StatusChip tone="error">
        {`Still a signer on ${formatList([...new Set(live.map((k) => k.licenseLabel))])}`}
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
          <StatusChip tone="pending">Not recorded</StatusChip>
        )}
      </div>
    );
  if (keys.some((k) => k.registered))
    return <StatusChip tone="pending">Revoke unfinished</StatusChip>;
  // Grant needs a verified wallet, which the member links by signing in once.
  if (member.status === 'ACCEPTED' && !member.signerAddress)
    return <span className="text-body-sm text-muted">Needs to sign in once</span>;
  return <span className="text-body-sm text-muted">None</span>;
};

const actionsFor = (
  member: TeamMember,
  licenses: TeamLicense[],
  handlers: MemberActionHandlers,
  showDataAccess: boolean,
): RowAction[] => {
  if (member.role === 'OWNER') return [];
  const items: RowAction[] = [];
  const add = (action: MemberAction, label: string, destructive = false) => {
    const handler = handlers[action];
    if (handler) items.push({ label, destructive, onSelect: () => handler(member) });
  };
  // Labels as in the spec: Grant, Revoke, Remove, Resend, Cancel invite.
  if (member.status === 'PENDING') {
    add('resend', 'Resend');
    add('cancel', 'Cancel invite', true);
    return items;
  }
  if (showDataAccess && grantCandidates(member, licenses).length) add('grant', 'Grant');
  // Revoking stays available with the flag off: keys granted earlier still work.
  // A removed member's leftover keys read "Retry" (spec: "Removed — … Retry").
  if (actionableKeys(memberLicenseKeys(member, licenses)).length)
    add('revoke', member.status === 'REVOKED' ? 'Retry' : 'Revoke', true);
  if (member.status === 'ACCEPTED') add('remove', 'Remove', true);
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
  const columns: IColumn[] = [
    { name: 'email', label: 'Member', render: NameCell },
    {
      name: 'role',
      label: 'Role',
      className: 'hidden md:table-cell',
      render: (m: TeamMember) => (
        <span className="text-body-sm text-fg">
          {m.role === 'OWNER' ? 'Owner' : 'Member'}
        </span>
      ),
    },
    {
      name: 'status',
      label: 'Status',
      render: (m: TeamMember) => {
        const { tone, label } = memberStatus(m);
        return <StatusChip tone={tone}>{label}</StatusChip>;
      },
    },
    ...(showDataAccess
      ? [
          {
            name: 'memberKeys',
            label: 'Data access',
            className: 'hidden md:table-cell',
            render: (m: TeamMember) => DataAccessCell(m, licenses, licensesReady),
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
              label={`Actions for ${m.email}`}
              items={actionsFor(m, licenses, handlers, showDataAccess)}
            />
          ),
        ]
      : undefined;
  return <Table columns={columns} data={members} actions={actions} />;
};
