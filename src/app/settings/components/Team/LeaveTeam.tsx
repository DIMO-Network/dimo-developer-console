'use client';
import { type FC, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/Button';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';
import { leaveTeam } from '@/actions/teams';
import { useMixPanel } from '@/hooks/useMixPanel';
import { useTeam } from '@/hooks/useTeam';
import { hardNavigate } from '@/utils/hardNavigate';
import { clearActiveTeamCookie, setActiveTeamCookie } from '@/utils/teamCookies';

// Members only. Leaving keeps any data access until the owner revokes it
// (spec: the C8 confirm says so).
export const LeaveTeam: FC = () => {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const { activeTeam, teams, reportRemoved, flashAfterReload } = useTeam();
  const { trackEvent } = useMixPanel();
  const [open, setOpen] = useState(false);
  if (!activeTeam || activeTeam.role !== 'MEMBER') return null;

  const leave = async () => {
    const result = await leaveTeam().catch(() => null);
    if (!result) {
      toast.error(t('leave.unreachable'));
      return;
    }
    if (!result.ok) {
      if (result.code === 'NOT_A_MEMBER') {
        setOpen(false);
        reportRemoved();
        return;
      }
      toast.error(result.message);
      return;
    }
    trackEvent('Team Left', { teamId: activeTeam.id });
    flashAfterReload({
      tone: 'success',
      message: t('leave.left', { teamName: activeTeam.name }),
    });
    const personal = teams.find((t) => t.isPersonal);
    if (personal) setActiveTeamCookie(personal.id);
    else clearActiveTeamCookie();
    hardNavigate('/app');
  };

  return (
    <div className="flex">
      <Button variant="destructive-ghost" onClick={() => setOpen(true)}>
        {t('leave.button')}
      </Button>
      <DeleteConfirmationModal
        isOpen={open}
        title={tCommon('teamCopy.leaveConfirm', {
          teamName: activeTeam.name,
          ownerEmail: activeTeam.ownerEmail,
        })}
        onConfirm={leave}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
};
