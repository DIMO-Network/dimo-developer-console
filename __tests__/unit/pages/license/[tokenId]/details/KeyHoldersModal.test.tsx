import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/hooks/useTeamMembers', () => ({
  useTeamMembers: () => ({
    members: [
      {
        id: 'm-sam',
        userId: 'u-sam',
        name: 'Sam Rivera',
        email: 'sam@harness.dev',
        status: 'ACCEPTED',
      },
      {
        id: 'm-ana',
        userId: null,
        name: null,
        email: 'ana@harness.dev',
        status: 'PENDING',
      },
    ],
  }),
}));
import { KeyHoldersModal } from '@/app/license/[tokenId]/details/components/Signers/KeyHoldersModal';

const onSubmit = jest.fn();
const open = (props: Partial<React.ComponentProps<typeof KeyHoldersModal>> = {}) =>
  render(
    <KeyHoldersModal
      submitLabel="Save"
      onSubmit={onSubmit}
      onClose={jest.fn()}
      {...props}
    />,
  );
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('KeyHoldersModal', () => {
  beforeEach(() => onSubmit.mockReset().mockResolvedValue(null));

  it('offers accepted members only', () => {
    open();
    expect(screen.getByRole('checkbox', { name: 'Sam Rivera' })).toBeInTheDocument();
    expect(screen.queryByText('ana@harness.dev')).toBeNull();
  });

  it('requires at least one holder', () => {
    open();
    save();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Choose at least one person, or type a name.',
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits members, typed names and the note', async () => {
    open();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sam Rivera' }));
    fireEvent.change(screen.getByLabelText('Other people (comma-separated)'), {
      target: { value: 'Ops on-call,  Night shift ,' },
    });
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Pager duty' } });
    save();
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        holders: [{ userId: 'u-sam' }, { name: 'Ops on-call' }, { name: 'Night shift' }],
        note: 'Pager duty',
      }),
    );
  });

  it('fills in earlier holders and shows the error the caller returns', async () => {
    onSubmit.mockResolvedValue('Holders must be members of this team.');
    open({
      initial: {
        holders: [{ userId: 'u-sam' }, { name: 'Ops on-call' }],
        note: 'Pager duty',
      },
    });
    expect(screen.getByRole('checkbox', { name: 'Sam Rivera' })).toBeChecked();
    expect(screen.getByLabelText('Other people (comma-separated)')).toHaveValue(
      'Ops on-call',
    );
    expect(screen.getByLabelText('Note')).toHaveValue('Pager duty');
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Holders must be members of this team.',
    );
  });
});
