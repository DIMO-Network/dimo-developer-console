import { fireEvent, render, screen } from '@testing-library/react';
import { useContext } from 'react';
import { LayoutContext } from '@/context/LayoutContext';
import { withLayout } from '@/hoc/withLayout';

const TestConsumer = () => {
  const { isSidebarCollapsed, setSidebarCollapsed } = useContext(LayoutContext);
  return (
    <div>
      <span data-testid="state">{isSidebarCollapsed ? 'collapsed' : 'expanded'}</span>
      <button onClick={() => setSidebarCollapsed(true)}>collapse</button>
    </div>
  );
};

const Wrapped = withLayout(TestConsumer);

describe('withLayout', () => {
  it('provides isSidebarCollapsed defaulting to false', () => {
    render(<Wrapped />);
    expect(screen.getByTestId('state').textContent).toBe('expanded');
  });

  it('setSidebarCollapsed updates state', () => {
    render(<Wrapped />);
    fireEvent.click(screen.getByText('collapse'));
    expect(screen.getByTestId('state').textContent).toBe('collapsed');
  });
});
