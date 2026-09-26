import { render, screen } from '@testing-library/react';
import { CSVUpload } from '@/components/CSVUpload';

describe('CSVUpload', () => {
  it('uses the primary button recipe and keeps the file input keyboard reachable', () => {
    const { container } = render(
      <CSVUpload
        vehicleTokenIds={[]}
        onChange={() => {}}
        fileInfo={[]}
        onMetadataChange={() => {}}
        onFileUpload={() => {}}
      />,
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    // Visually hidden, not display:none, so Tab reaches it.
    expect(input).toHaveClass('sr-only');
    expect(input).not.toHaveClass('hidden');
    expect(screen.getByText('Upload').closest('label')).toHaveClass('button', 'primary');
    input.focus();
    expect(document.activeElement).toBe(input);
  });
});
