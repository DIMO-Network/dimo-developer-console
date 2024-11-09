import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Toast } from '@/components/Toast';

describe('Toast', () => {
  it('renders a success notification', () => {
    const { container } = render(
      <Toast
        id={1234}
        message="Success information"
        type="success"
        title="Success"
      />,
    );

    expect(container).toMatchSnapshot();
  });

  it('renders an error notification', () => {
    const { container } = render(
      <Toast
        id={1234}
        message="Error information"
        type="error"
        title="Error"
      />,
    );

    expect(container).toMatchSnapshot();
  });

  it('should close the notification', async () => {
    render(
      <Toast
        id={1234}
        message="Success information"
        type="success"
        title="Success"
      />,
    );

    const closeElm = await screen.findByRole('close-toast');
    fireEvent.click(closeElm);

    waitFor(() => {
      expect(closeElm).not.toBeInTheDocument();
    });
  });
});
