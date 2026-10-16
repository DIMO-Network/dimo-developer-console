'use client';
import { type FC, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { acceptPendingInvite, previewPendingInvite } from '@/actions/invites';
import { useMixPanel } from '@/hooks/useMixPanel';
import { inviteErrorMessage } from '@/utils/inviteErrors';
import type { InvitePreview, TeamSummary } from '@/types/team';

const explain = (code: string | null, status: number) => {
  // A network failure keeps the cookie; a later page asks again.
  if (status === 0) return;
  if (code === 'ALREADY_MEMBER') toast("You're already a member of this team.");
  else toast.error(inviteErrorMessage(code));
};

// The invite cookie is set only by a page load of /sign-in?invite=, so once
// there was none, section changes needn't ask again (Next runs server actions
// one at a time). The cache entry ends with the query cache's gc or a logout.
const NO_PENDING_INVITE = ['pending-invite', 'none'];

// A pending invite (HttpOnly cookie, contracts C4) is accepted only after the
// user confirms which team and owner they are joining.
export const PendingInvite: FC<{ onJoined: (team: TeamSummary) => void }> = ({
  onJoined,
}) => {
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const { trackEvent } = useMixPanel();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (queryClient.getQueryData(NO_PENDING_INVITE)) return;
    void (async () => {
      const result = await previewPendingInvite();
      if (!result) {
        queryClient.setQueryData(NO_PENDING_INVITE, true);
        return;
      }
      if (result.ok) setPreview(result.data);
      else explain(result.code, result.status);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const join = async () => {
    setBusy(true);
    const result = await acceptPendingInvite();
    setBusy(false);
    setPreview(null);
    if (!result) return;
    if (result.ok) {
      trackEvent('Team Invite Accepted', { teamId: result.data.team.id });
      onJoined(result.data.team);
      return;
    }
    explain(result.code, result.status);
  };

  if (!preview) return null;
  return (
    <Modal
      isOpen
      setIsOpen={(open) => {
        if (!open && !busy) setPreview(null);
      }}
      showClose={!busy}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 pr-8">
          <Title component="h3" className="text-panel-title">
            {`Join ${preview.teamName} owned by ${preview.ownerEmail}?`}
          </Title>
          <p className="text-body-sm text-muted">
            You&apos;ll see the team&apos;s licenses. The owner decides whether you also
            get data access.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={join} loading={busy}>
            Join team
          </Button>
          <Button variant="secondary" onClick={() => setPreview(null)} disabled={busy}>
            Not now
          </Button>
        </div>
      </div>
    </Modal>
  );
};
