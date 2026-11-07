'use client';
import { type FC, useContext, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { toast } from 'sonner';
import { useFormatter, useTranslations } from 'next-intl';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { LoadingStatusContext } from '@/context/LoadingStatusContext';
import {
  markLicenseSignerDisabled,
  removeTeamMember,
  upsertLicenseSigner,
} from '@/actions/teams';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useSetLicenseSigners } from '@/hooks/useSetLicenseSigners';
import type { TeamLicense } from '@/hooks/useTeamLicenses';
import type { TeamMember } from '@/types/team';
import { registryWrite } from '@/utils/registryWrite';
import { txErrorStatus } from '@/utils/txErrorStatus';
import { actionableKeys, memberLicenseKeys, type MemberLicenseKey } from './memberKeys';
import { displayName } from './MembersTable';
import { labelsOfKeys, tokenIdsOfKeys } from './RevokeAccessModal';
import { revokeMemberKeys } from './revokeMemberKeys';
import type { SignerToggle } from './signerOverlay';
import { WebhookReview } from './WebhookReview';

interface Props {
  member: TeamMember;
  licenses: TeamLicense[];
  teamName: string;
  onClose: () => void;
  onDone: (changed?: SignerToggle[]) => void;
}

// Revoke first, then end the membership. A failed transaction still removes
// the member (the proxy refuses them within a minute either way); their row
// stays in the Team list as "Still a signer on …" with Retry (C7 lists REVOKED
// members who still hold a key). A key with no registry row would not be
// listed, so it is recorded first; if that fails too, the member stays.
export const RemoveMemberModal: FC<Props> = ({
  member,
  licenses,
  teamName,
  onClose,
  onDone,
}) => {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const { setLoadingStatus, clearLoadingStatus } = useContext(LoadingStatusContext);
  const setLicenseSigners = useSetLicenseSigners();
  const { trackEvent } = useMixPanel();
  const [keys] = useState(() => actionableKeys(memberLicenseKeys(member, licenses)));
  const [busy, setBusy] = useState(false);
  const name = displayName(member);
  const licenseList = (list: MemberLicenseKey[]) => format.list(labelsOfKeys(list));

  const recordKeys = async (unrecorded: MemberLicenseKey[]) => {
    if (!member.userId) return false;
    for (const key of unrecorded) {
      const result = await registryWrite(() =>
        upsertLicenseSigner(key.tokenId, key.signer, {
          kind: 'MEMBER',
          holders: [{ userId: member.userId! }],
        }),
      );
      if (!result.ok) return false;
    }
    return true;
  };

  const remove = async () => {
    setBusy(true);
    setLoadingStatus({ status: 'loading', label: t('remove.loading', { name }) });
    let unstamped: MemberLicenseKey[] = [];
    let txError: unknown = null;
    if (keys.length) {
      const outcome = await revokeMemberKeys(keys, {
        disable: (changes) => setLicenseSigners('disableSigner', changes),
        stamp: markLicenseSignerDisabled,
      });
      txError = outcome.txError;
      unstamped = outcome.unstamped;
      if (txError) Sentry.captureException(txError);
      // console-api lists a departed member only by their registry keys: a key
      // still enabled with no row would vanish from Team. Record it while they
      // are still a member (it is their current wallet); if that fails, keep
      // them on the team.
      const unrecorded = keys.filter((k) => !k.registered);
      if (txError && unrecorded.length && !(await recordKeys(unrecorded))) {
        setBusy(false);
        setLoadingStatus(txErrorStatus(txError, tCommon));
        toast.error(
          t('remove.keptOnTeam', { name, teamName, licenses: licenseList(keys) }),
        );
        onDone();
        return;
      }
      if (!txError)
        trackEvent('Data Access Revoked', {
          memberId: member.id,
          tokenIds: tokenIdsOfKeys(keys),
        });
    }
    if (member.status !== 'REVOKED' && member.status !== 'LEFT') {
      const result = await removeTeamMember(member.id).catch(() => null);
      if (!result?.ok) {
        setBusy(false);
        setLoadingStatus({
          status: 'error',
          label: result?.message ?? t('remove.failedFallback'),
        });
        onDone();
        return;
      }
    }
    setBusy(false);
    trackEvent('Team Member Removed', { memberId: member.id });
    if (txError) {
      setLoadingStatus(txErrorStatus(txError, tCommon));
      toast.error(t('remove.removedStillSigner', { name, licenses: licenseList(keys) }));
    } else {
      clearLoadingStatus();
      toast.success(t('remove.removed', { name, teamName }));
    }
    if (unstamped.length) {
      toast.error(t('remove.notRecorded', { licenses: licenseList(unstamped) }));
    }
    onDone(
      txError
        ? []
        : keys.map(({ tokenId, signer }) => ({ tokenId, signer, enabled: false })),
    );
    onClose();
  };

  return (
    <Modal isOpen setIsOpen={(open) => !open && !busy && onClose()} showClose={!busy}>
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          {t('remove.title', { name, teamName })}
        </Title>
        <p className="text-body-sm text-muted">
          {keys.length
            ? t('remove.descriptionWithKeys', { licenses: licenseList(keys) })
            : t('remove.description')}
        </p>
        <WebhookReview member={member} licenses={licenses} />
        <div className="flex flex-col gap-2">
          <Button variant="destructive" loading={busy} onClick={remove}>
            {t('remove.confirm')}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onClose}>
            {tCommon('actions.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
