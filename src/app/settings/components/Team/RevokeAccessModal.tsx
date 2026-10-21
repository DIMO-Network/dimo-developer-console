'use client';
import { type FC, useContext, useMemo, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { CheckboxField } from '@/components/CheckboxField';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import { markLicenseSignerDisabled } from '@/actions/teams';
import { formatList } from '@/config/teamCopy';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useSetLicenseSigners } from '@/hooks/useSetLicenseSigners';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { actionableKeys, memberLicenseKeys, type MemberLicenseKey } from './memberKeys';
import { displayName } from './MembersTable';
import { revokeMemberKeys } from './revokeMemberKeys';
import type { SignerToggle } from './signerOverlay';
import { WebhookReview } from './WebhookReview';

export const labelsOfKeys = (keys: MemberLicenseKey[]) =>
  formatList([...new Set(keys.map((k) => k.licenseLabel))]);
export const tokenIdsOfKeys = (keys: MemberLicenseKey[]) =>
  [...new Set(keys.map((k) => k.tokenId))].sort((a, b) => a - b);

interface Props {
  member: TeamMember;
  licenses: TeamLicense[];
  onClose: () => void;
  onDone: (changed: SignerToggle[]) => void;
}

export const RevokeAccessModal: FC<Props> = ({ member, licenses, onClose, onDone }) => {
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const setLicenseSigners = useSetLicenseSigners();
  const { trackEvent } = useMixPanel();
  const [keys] = useState(() => actionableKeys(memberLicenseKeys(member, licenses)));
  // One entry per license; every license is chosen to start with.
  const choices = useMemo(
    () => [...new Map(keys.map((k) => [k.tokenId, k.licenseLabel])).entries()],
    [keys],
  );
  const [chosen, setChosen] = useState<number[]>(() =>
    choices.map(([tokenId]) => tokenId),
  );
  const [busy, setBusy] = useState(false);
  const [unstamped, setUnstamped] = useState<MemberLicenseKey[] | null>(null);
  const name = displayName(member);
  const target = keys.filter((k) => chosen.includes(k.tokenId));

  const run = async (target: MemberLicenseKey[], stampOnly = false) => {
    setBusy(true);
    setLoadingStatus({ status: 'loading', label: `Revoking ${name}'s data access` });
    const outcome = await revokeMemberKeys(
      target,
      {
        disable: (changes) => setLicenseSigners('disableSigner', changes),
        stamp: markLicenseSignerDisabled,
      },
      { stampOnly },
    );
    setBusy(false);
    onDone(
      outcome.txError || stampOnly
        ? []
        : target.map(({ tokenId, signer }) => ({ tokenId, signer, enabled: false })),
    );
    if (outcome.txError) {
      Sentry.captureException(outcome.txError);
      setLoadingStatus(txErrorStatus(outcome.txError));
      return;
    }
    clearLoadingStatus();
    if (!stampOnly) {
      trackEvent('Data Access Revoked', {
        memberId: member.id,
        tokenIds: tokenIdsOfKeys(target),
      });
    }
    if (outcome.unstamped.length) {
      // Off-chain now: a retry only stamps.
      setUnstamped(outcome.unstamped);
      return;
    }
    toast.success(`${name}'s data access is revoked.`);
    onClose();
  };

  return (
    <Modal isOpen setIsOpen={(open) => !open && !busy && onClose()} showClose={!busy}>
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          {`Revoke ${name}'s data access?`}
        </Title>
        <p className="text-body-sm text-muted">
          Their wallet is removed from the chosen licenses on-chain. Tokens they already
          hold stop working within about 10 minutes.
        </p>
        <ul className="flex flex-col gap-2">
          {choices.map(([tokenId, label]) => (
            <li key={tokenId} className="flex items-center gap-2">
              <CheckboxField
                id={`revoke-${tokenId}`}
                checked={chosen.includes(tokenId)}
                disabled={busy || !!unstamped}
                onChange={(e) =>
                  setChosen((prev) =>
                    e.target.checked
                      ? [...prev, tokenId]
                      : prev.filter((id) => id !== tokenId),
                  )
                }
              />
              <label htmlFor={`revoke-${tokenId}`} className="text-body-sm text-fg">
                {label}
              </label>
            </li>
          ))}
        </ul>
        <WebhookReview member={member} licenses={licenses} />
        {unstamped ? (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-body-sm text-negative">
              {`Data access is off, but we couldn't record that for ${labelsOfKeys(unstamped)}.`}
            </p>
            <Button
              variant="secondary"
              loading={busy}
              onClick={() => run(unstamped, true)}
            >
              Retry
            </Button>
          </div>
        ) : (
          <Button
            variant="destructive"
            loading={busy}
            disabled={!target.length}
            onClick={() => run(target)}
          >
            Revoke data access
          </Button>
        )}
      </div>
    </Modal>
  );
};
