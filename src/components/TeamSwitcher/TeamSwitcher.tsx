'use client';
import { type FC, useEffect, useRef, useState } from 'react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { useTeam } from '@/hooks/useTeam';
import type { TeamRole } from '@/types/team';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<TeamRole, string> = { OWNER: 'Owner', MEMBER: 'Member' };

// Sidebar team picker. Only rendered when the user belongs to more than one
// team; picking another team reloads into Home (TeamProvider.switchTeam).
export const TeamSwitcher: FC<{ collapsed?: boolean }> = ({ collapsed = false }) => {
  const { teams, activeTeam, switchTeam } = useTeam();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  if (teams.length < 2 || !activeTeam) return null;

  return (
    <div ref={ref} className="relative mb-2">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Team: ${activeTeam.name}. Switch team`}
        title={collapsed ? activeTeam.name : undefined}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-left transition-colors hover:bg-nav-hover',
          collapsed && 'justify-center px-0',
        )}
      >
        <span
          aria-hidden="true"
          className="flex size-7 shrink-0 items-center justify-center rounded-chip bg-control text-label text-ink"
        >
          {activeTeam.name.charAt(0).toUpperCase()}
        </span>
        {!collapsed && (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-body-sm font-medium text-ink">
                {activeTeam.name}
              </span>
              <span className="text-label text-muted">{ROLE_LABEL[activeTeam.role]}</span>
            </span>
            <ChevronUpDownIcon
              aria-hidden="true"
              className="size-4 shrink-0 text-muted"
            />
          </>
        )}
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Teams"
          className="absolute left-0 top-full z-20 mt-1 flex w-[220px] flex-col gap-0.5 rounded-control border border-outline bg-overlay p-1 shadow-float"
        >
          {teams.map((team) => {
            const selected = team.id === activeTeam.id;
            return (
              <li key={team.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    if (!selected) switchTeam(team.id);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-chip px-2.5 py-2 text-left text-body-sm',
                    selected
                      ? 'bg-selected-bg text-selected-fg hover:bg-selected-bg'
                      : 'text-fg hover:bg-control',
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{team.name}</span>
                  <span
                    className={cn(
                      'text-label',
                      selected ? 'text-selected-fg/75' : 'text-muted',
                    )}
                  >
                    {ROLE_LABEL[team.role]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TeamSwitcher;
