'use client';
import { type FC, useContext, useMemo, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { CheckboxField } from '@/components/CheckboxField';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { upsertLicenseSigner } from '@/actions/teams';
import { formatList, grantWarning } from '@/config/teamCopy';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useSetLicenseSigners, type SignerChange } from '@/hooks/useSetLicenseSigners';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { registryWrite } from '@/utils/registryWrite';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { grantCandidates } from './memberKeys';
import { displayName } from './MembersTable';

interface Props {
  member: TeamMember;
  licenses: TeamLicense[];
  onClose: () => void;
  onGranted: () => void;
}

export const GrantAccessModal: FC<Props> = ({ member, licenses, onClose, onGranted }) => {
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const setLicenseSigners = useSetLicenseSigners();
  const { trackEvent } = useMixPanel();
  // Snapshot: a refetch after the grant must not reshuffle the list mid-flow.
  const [candidates] = useState(() => grantCandidates(member, licenses));
  const [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  // retryable: rejected or 5xx after registryWrite's retry. refused: a 4xx,
  // shown with console-api's message and never retried.
  const [unrecorded, setUnrecorded] = useState<{
    retryable: SignerChange[];
    refused: { tokenId: number; message: string }[];
  } | null>(null);
  const name = displayName(member);
  const labels = useMemo(
    () => new Map(candidates.map(({ license }) => [license.tokenId, license.label])),
    [candidates],
  );
  const labelsOf = (tokenIds: number[]) =>
    formatList(tokenIds.map((id) => labels.get(id) ?? `License #${id}`));

  const toggle = (tokenId: number, checked: boolean) =>
    setSelected((prev) =>
      checked
        ? [...prev, tokenId].sort((a, b) => a - b)
        : prev.filter((id) => id !== tokenId),
    );

  // Registry rows after the chain: the PUT clears disabledAt (C7).
  const record = async (changes: SignerChange[]) => {
    const retryable: SignerChange[] = [];
    const refused: { tokenId: number; message: string }[] = [];
    for (const change of changes) {
      const result = await registryWrite(() =>
        upsertLicenseSigner(change.tokenId, change.signer, {
          kind: 'MEMBER',
          holders: [{ userId: member.userId! }],
        }),
      );
      if (result.ok) continue;
      if (result.status >= 400 && result.status < 500)
        refused.push({ tokenId: change.tokenId, message: result.message });
      else retryable.push(change);
    }
    return { retryable, refused };
  };

  const settle = (
    outcome: {
      retryable: SignerChange[];
      refused: { tokenId: number; message: string }[];
    },
    all: SignerChange[],
  ) => {
    if (outcome.retryable.length || outcome.refused.length) {
      setUnrecorded(outcome);
      return;
    }
    toast.success(
      `${name} now has data access to ${labelsOf(all.map((c) => c.tokenId))}.`,
    );
    onClose();
  };

  const grant = async () => {
    const signer = member.signerAddress!;
    const changes = selected.map((tokenId) => ({ tokenId, signer }));
    const toEnable = changes.filter(
      (c) => !candidates.find((k) => k.license.tokenId === c.tokenId)?.onChain,
    );
    setBusy(true);
    setLoadingStatus({ status: 'loading', label: `Granting ${name} data access` });
    try {
      await setLicenseSigners('enableSigner', toEnable);
    } catch (error) {
      Sentry.captureException(error);
      setBusy(false);
      setLoadingStatus(txErrorStatus(error));
      return;
    }
    trackEvent('Data Access Granted', { memberId: member.id, tokenIds: selected });
    const outcome = await record(changes);
    clearLoadingStatus();
    setBusy(false);
    onGranted();
    settle(outcome, changes);
  };

  const retry = async () => {
    if (!unrecorded) return;
    setBusy(true);
    const outcome = await record(unrecorded.retryable);
    setBusy(false);
    onGranted();
    settle(
      {
        retryable: outcome.retryable,
        refused: [...unrecorded.refused, ...outcome.refused],
      },
      unrecorded.retryable,
    );
  };

  return (
    <Modal isOpen setIsOpen={(open) => !open && !busy && onClose()} showClose={!busy}>
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          {`Grant ${name} data access`}
        </Title>
        <p className="text-body-sm text-muted">
          Choose the licenses {name} can read in Vehicles.
        </p>
        <ul className="flex flex-col gap-2">
          {candidates.map(({ license }) => (
            <li key={license.tokenId} className="flex items-center gap-2">
              <CheckboxField
                id={`grant-${license.tokenId}`}
                checked={selected.includes(license.tokenId)}
                disabled={busy || !!unrecorded}
                onChange={(e) => toggle(license.tokenId, e.target.checked)}
              />
              <label
                htmlFor={`grant-${license.tokenId}`}
                className="text-body-sm text-fg"
              >
                {license.label}
              </label>
            </li>
          ))}
        </ul>
        {selected.length > 0 && (
          <p className="rounded-control bg-control p-3 text-body-sm text-fg">
            {grantWarning(name, labelsOf(selected))}
          </p>
        )}
        {unrecorded ? (
          <div role="alert" className="flex flex-col items-start gap-2">
            {unrecorded.retryable.length > 0 && (
              <p className="text-body-sm text-negative">
                {`Data access is on, but we couldn't record it for ${labelsOf(unrecorded.retryable.map((c) => c.tokenId))}, so ${name} can't use it yet.`}
              </p>
            )}
            {unrecorded.refused.map(({ tokenId, message }) => (
              <p key={tokenId} className="text-body-sm text-negative">
                {`${labelsOf([tokenId])}: ${message}`}
              </p>
            ))}
            {unrecorded.refused.length > 0 && (
              <p className="text-body-sm text-muted">
                Those keys are enabled on-chain but not recorded. Check the member&apos;s
                row in the Team list before granting again.
              </p>
            )}
            {unrecorded.retryable.length > 0 ? (
              <Button variant="secondary" loading={busy} onClick={retry}>
                Try again
              </Button>
            ) : (
              <Button variant="secondary" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        ) : (
          <Button loading={busy} disabled={!selected.length} onClick={grant}>
            Grant data access
          </Button>
        )}
      </div>
    </Modal>
  );
};
