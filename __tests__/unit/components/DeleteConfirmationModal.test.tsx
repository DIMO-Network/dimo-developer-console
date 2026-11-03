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
});
