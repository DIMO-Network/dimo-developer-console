'use client';
import { type FC, useState } from 'react';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { CheckboxField } from '@/components/CheckboxField';
import { TextField } from '@/components/TextField';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import type { HolderInput } from '@/types/team';

export interface KeyHolders {
  holders: HolderInput[];
  note: string | null;
}

interface Props {
  signer?: `0x${string}`;
  initial?: KeyHolders;
  submitLabel: string;
  // Resolves to an error message to show, or null when done.
  onSubmit: (value: KeyHolders) => Promise<string | null>;
  onClose: () => void;
}

const NOTE_MAX = 200;

// "Who is this key for?" — team members, other people by name, and a note.
// console-api refuses an API_KEY or EXTERNAL row without a holder.
export const KeyHoldersModal: FC<Props> = ({
  signer,
  initial,
  submitLabel,
  onSubmit,
  onClose,
}) => {
  const { members } = useTeamMembers();
  const people = members.filter((m) => m.status === 'ACCEPTED' && m.userId);
  const [userIds, setUserIds] = useState<string[]>(() =>
    (initial?.holders ?? []).flatMap((h) => ('userId' in h ? [h.userId] : [])),
  );
  const [others, setOthers] = useState(() =>
    (initial?.holders ?? []).flatMap((h) => ('name' in h ? [h.name] : [])).join(', '),
  );
  const [note, setNote] = useState(initial?.note ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const holders: HolderInput[] = [
      ...userIds.map((userId) => ({ userId })),
      ...others
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => ({ name })),
    ];
    if (!holders.length) {
      setError('Choose at least one person, or type a name.');
      return;
    }
    if (note.trim().length > NOTE_MAX) {
      setError(`Keep the note under ${NOTE_MAX} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    const failure = await onSubmit({ holders, note: note.trim() || null });
    setBusy(false);
    if (failure) setError(failure);
  };

  return (
    <Modal isOpen setIsOpen={(open) => !open && !busy && onClose()} showClose={!busy}>
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          Who is this key for?
        </Title>
        {signer && (
          <span className="break-all font-mono text-code text-muted">{signer}</span>
        )}
        {people.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label text-muted">Team members</legend>
            {people.map((m) => (
              <div key={m.id} className="flex items-center gap-2">
                <CheckboxField
                  id={`holder-${m.id}`}
                  checked={userIds.includes(m.userId!)}
                  onChange={(e) =>
                    setUserIds((prev) =>
                      e.target.checked
                        ? [...prev, m.userId!]
                        : prev.filter((id) => id !== m.userId),
                    )
                  }
                />
                <label htmlFor={`holder-${m.id}`} className="text-body-sm text-fg">
                  {m.name ?? m.email}
                </label>
              </div>
            ))}
          </fieldset>
        )}
        <label htmlFor="holder-others" className="text-label text-muted">
          Other people (comma-separated)
        </label>
        <TextField
          id="holder-others"
          value={others}
          onChange={(e) => setOthers(e.target.value)}
        />
        <label htmlFor="holder-note" className="text-label text-muted">
          Note
        </label>
        <TextField
          id="holder-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-body-sm text-negative">
            {error}
          </p>
        )}
        <Button loading={busy} onClick={submit}>
          {submitLabel}
        </Button>
      </div>
    </Modal>
  );
};
