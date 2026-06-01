import { AppCard } from '@/components/AppCard';
import { appListMock } from '@/mocks/appList';
import { render, screen } from '@testing-library/react';

describe('AppCard', () => {
  it('renders an app card', () => {
    const [app] = appListMock;
    const { container } = render(<AppCard {...app} />);

    const appNameElm = screen.getByText('Test App');

    expect(appNameElm).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});
