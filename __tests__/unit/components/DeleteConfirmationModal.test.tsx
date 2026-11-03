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
    const onConfirm = jest.fn(async () => {
      throw new Error('boom');
    });
    const onCancel = jest.fn();
    const { rerender } = renderModal({ onConfirm, onCancel });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalled());
    rerender(
      <DeleteConfirmationModal
        isOpen
        title="Delete it?"
        onConfirm={onConfirm}
        onCancel={onCancel}
        error="The transaction was denied"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('The transaction was denied');
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
