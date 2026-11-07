'use client';
import { type FC, type FormEvent, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { TextField } from '@/components/TextField';
import { Button } from '@/components/Button';
import { inviteTeamMember } from '@/actions/teams';
import { useMixPanel } from '@/hooks/useMixPanel';
import type { TeamMember } from '@/types/team';
import { inviteSendError } from './inviteSendError';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  teamId: string;
  onInvited: (member: TeamMember) => void;
}

export const InviteMemberModal: FC<Props> = ({ isOpen, onClose, teamId, onInvited }) => {
  const t = useTranslations('settings');
  const { trackEvent } = useMixPanel();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setEmail('');
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    try {
      const result = await inviteTeamMember(address);
      if (!result.ok) {
        setError(inviteSendError(result, address, t));
        return;
      }
      onInvited(result.data.member);
      trackEvent('Team Invite Sent', { teamId });
      toast.success(t('inviteModal.sent', { email: address }));
      setEmail('');
      onClose();
    } catch {
      setError(t('inviteError.default'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} setIsOpen={(open) => !open && close()} showClose={!busy}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <Title component="h2" className="text-panel-title text-ink">
          {t('inviteModal.title')}
        </Title>
        <p className="text-body-sm text-muted">{t('inviteModal.description')}</p>
        <label htmlFor="invite-email" className="text-label text-muted">
          {t('inviteModal.emailLabel')}
        </label>
        <TextField
          id="invite-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-body-sm text-negative">
            {error}
          </p>
        )}
        <Button type="submit" loading={busy} disabled={!email.trim()}>
          {t('inviteModal.send')}
        </Button>
      </form>
    </Modal>
  );
};
