import { AppCard } from '@/components/AppCard';
import { appListMock } from '@/mocks/appList';
import { render, screen } from '@testing-library/react';

describe('AppCard', () => {
  it('renders an app card', () => {
    const [app] = appListMock;
    const { container } = render(<AppCard {...app} />);

    const appNameElm = screen.getByText('Test App');
    const environmentElm = screen.getByText('sandbox');

    expect(appNameElm).toBeInTheDocument();
    expect(environmentElm).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});
