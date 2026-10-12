import { render } from '@testing-library/react';
import { SettingsIcon } from '@/components/Icons';

describe('SettingsIcon', () => {
  it('renders a settings icon', () => {
    const { container } = render(<SettingsIcon className="w-5 h-6" />);

    const settingsIcon = container.querySelector('svg');

    expect(settingsIcon).toBeInTheDocument();
  });
});
