import { render, screen } from '@testing-library/react';
import { MonitorHeartIcon } from '@/components/Icons';

describe('MonitorHeartIcon', () => {
  it('renders a monitor heart icon', () => {
    render(<MonitorHeartIcon className="w-5 h-6" />);

    const monitorHeart = screen.getByRole('monitor-heart-icon');

    expect(monitorHeart).toBeInTheDocument();
  });
});
