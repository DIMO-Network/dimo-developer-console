import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DeleteConfirmationModal } from '@/components/DeleteConfirmationModal';

const renderModal = (
  props: Partial<React.ComponentProps<typeof DeleteConfirmationModal>>,
) =>
  render(
    <DeleteConfirmationModal
      isOpen
      title="Delete it?"
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
      {...props}
    />,
  );

describe('DeleteConfirmationModal', () => {
  it('shows the progress label while confirming', async () => {
    let resolve: () => void = () => {};
    const onConfirm = jest.fn(() => new Promise<void>((r) => (resolve = r)));
    renderModal({ onConfirm, loadingLabel: 'Waiting for the network to confirm…' });
    expect(screen.queryByText('Waiting for the network to confirm…')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(
      await screen.findByText('Waiting for the network to confirm…'),
    ).toBeInTheDocument();
    resolve();
    await waitFor(() =>
      expect(screen.queryByText('Waiting for the network to confirm…')).toBeNull(),
    );
  });

  it('shows an error and stays open when confirming fails', async () => {
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});
    const onCancel = jest.fn();
    const Caller = () => {
      const [error, setError] = React.useState<string | null>(null);
      return (
        <DeleteConfirmationModal
          isOpen
          title="Delete it?"
          error={error}
          onCancel={onCancel}
          onConfirm={async () => {
            try {
              await Promise.reject(new Error('boom'));
            } catch {
              setError('The transaction was denied');
              throw new Error('boom');
            }
          }}
        />
      );
    };
    render(<Caller />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The transaction was denied',
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled(),
    );
    expect(onCancel).not.toHaveBeenCalled();
  });

  // A caller that forgets to set `error` would otherwise fail without a trace. The
  // message is fixed and only the error's name is logged: a message could carry
  // anything the caller sent.
  it('logs a rejected confirm without its message', async () => {
    const log = jest.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new TypeError('0xsecret');
    renderModal({ onConfirm: jest.fn(async () => Promise.reject(failure)) });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(log).toHaveBeenCalledWith('Delete confirmation failed:', 'TypeError'),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('0xsecret');
    log.mockRestore();
  });
});
