import { render, screen } from '@testing-library/react';
import { SettingsIcon } from '@/components/Icons';

describe('SettingsIcon', () => {
  it('renders a settings icon', () => {
    render(<SettingsIcon className="w-5 h-6" />);

    const settingsIcon = screen.getByRole('settings-icon');

    expect(settingsIcon).toBeInTheDocument();
  });
});
