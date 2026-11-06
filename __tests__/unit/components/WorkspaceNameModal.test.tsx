import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mockProcess = jest.fn();
jest.mock('@/hooks/useContractGA', () => ({
  useContractGA: () => ({ processTransactions: mockProcess }),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));
import { toast } from 'sonner';
import { WorkspaceNameModal } from '@/components/WorkspaceNameModal/WorkspaceNameModal';

const license = { tokenId: 42, alias: 'Fleet' };

const rename = (value: string) => {
  const setIsOpen = jest.fn();
  render(<WorkspaceNameModal isOpen setIsOpen={setIsOpen} license={license} />);
  fireEvent.change(screen.getByPlaceholderText('Enter developer license name'), {
    target: { value },
  });
  fireEvent.click(screen.getByText('Save changes'));
  return { setIsOpen };
};

describe('WorkspaceNameModal', () => {
  it('stops a name the contract would refuse before it costs a transaction', async () => {
    rename('x'.repeat(33));

    expect(await screen.findByText(/at most 32/)).toBeInTheDocument();
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('counts bytes, as the contract does, not letters', async () => {
    rename('é'.repeat(17));

    expect(await screen.findByText(/at most 32/)).toBeInTheDocument();
    expect(mockProcess).not.toHaveBeenCalled();
  });

  it('sends the longest name the contract accepts', async () => {
    mockProcess.mockResolvedValue({ success: true });
    const { setIsOpen } = rename('x'.repeat(32));

    await waitFor(() => expect(setIsOpen).toHaveBeenCalledWith(false));
    expect(mockProcess).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalled();
  });

  it('does not report a rename that reverted as done', async () => {
    mockProcess.mockResolvedValue({ success: false });
    const { setIsOpen } = rename('New name');

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to update developer license name'),
    );
    expect(toast.success).not.toHaveBeenCalled();
    expect(setIsOpen).not.toHaveBeenCalled();
  });
});
