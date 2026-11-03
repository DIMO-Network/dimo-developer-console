import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BuildForForm } from '@/app/sign-up/components/BuildForForm';

const describeBuild = (length: number) => 'x'.repeat(length);

const fillSomethingElse = (text: string) => {
  fireEvent.click(screen.getByText('Something else'));
  fireEvent.change(screen.getByRole('build-for-something-else-input'), {
    target: { value: text },
  });
};

describe('BuildForForm', () => {
  it('stops a build description over 150 characters', async () => {
    const onNext = jest.fn();
    render(<BuildForForm onNext={onNext} />);

    fillSomethingElse(describeBuild(151));
    fireEvent.click(screen.getByRole('continue-button'));

    expect(await screen.findByText('Use at most 150 characters')).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('accepts a build description of exactly 150 characters', async () => {
    const onNext = jest.fn();
    render(<BuildForForm onNext={onNext} />);

    fillSomethingElse(describeBuild(150));
    fireEvent.click(screen.getByRole('continue-button'));

    await waitFor(() => expect(onNext).toHaveBeenCalledTimes(1));
    expect(onNext).toHaveBeenCalledWith('build-for', {
      company: { build_for: 'something-else', build_for_text: describeBuild(150) },
    });
    expect(screen.queryByText('Use at most 150 characters')).not.toBeInTheDocument();
  });

  it('still asks for a description when "Something else" is empty', async () => {
    const onNext = jest.fn();
    render(<BuildForForm onNext={onNext} />);

    fillSomethingElse('');
    fireEvent.click(screen.getByRole('continue-button'));

    expect(await screen.findByText('This field is required')).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });
});
