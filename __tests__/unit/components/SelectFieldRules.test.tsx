import { act, fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';

import { CompanyInfoForm } from '@/app/sign-up/components/CompanyInfoForm';
import { DevSupportForm } from '@/components/DevSupportForm';
import { ValueInput } from '@/components/Webhooks/fields/CELBuilder/ValueInput';
import { WebhookServiceField } from '@/components/Webhooks/fields/Service';
import { WebhookFormInput } from '@/types/webhook';

jest.mock('@/hooks', () => ({
  useGlobalAccount: () => ({ currentUser: { email: 'jane@example.com' } }),
}));

// Required rules on a SelectField must hold. react-hook-form 7.91 drops rules a later
// register() call of the same name leaves out, and the SelectField's own Controller
// registers its name on every render, so rules spread in through register() were lost.

const flush = () => act(() => new Promise((resolve) => setTimeout(resolve, 0)));

const click = async (element: Element) => {
  await act(async () => {
    fireEvent.click(element);
  });
  await flush();
};

const pick = (container: HTMLElement, text: string) => {
  const item = Array.from(container.querySelectorAll('.custom-item')).find(
    (element) => element.textContent === text,
  );
  if (!item) throw new Error(`No option "${text}"`);
  return click(item);
};

const WebhookForm = ({
  children,
  values,
}: {
  children: React.ReactNode;
  values?: Partial<WebhookFormInput>;
}) => {
  const methods = useForm<WebhookFormInput>({ mode: 'onChange', defaultValues: values });
  return (
    <FormProvider {...methods}>
      {children}
      <span data-testid="valid">{String(methods.formState.isValid)}</span>
    </FormProvider>
  );
};

const isValid = () => screen.getByTestId('valid').textContent;

describe('required SelectField rules', () => {
  it('sign-up stops without a developer type', async () => {
    const onNext = jest.fn();
    render(<CompanyInfoForm onNext={onNext} />);

    await click(screen.getByText('Finish sign up'));

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(onNext).not.toHaveBeenCalled();
  });

  it('a webhook needs a service', async () => {
    const { container } = render(
      <WebhookForm values={{ service: '' }}>
        <WebhookServiceField />
      </WebhookForm>,
    );
    await flush();
    expect(isValid()).toBe('false');

    await pick(container, 'VSS Signals');
    expect(isValid()).toBe('true');
  });

  it('a true/false condition needs a value', async () => {
    const { container } = render(
      <WebhookForm
        values={{
          cel: {
            operator: 'AND',
            conditions: [{ field: 'vss.isIgnitionOn', operator: '==', value: '' }],
          },
        }}
      >
        <ValueInput index={0} />
      </WebhookForm>,
    );
    await flush();
    expect(isValid()).toBe('false');

    await pick(container, 'True');
    expect(isValid()).toBe('true');
  });

  it('the support form needs an inquiry type', async () => {
    const onSubmit = jest.fn();
    render(<DevSupportForm onSubmit={onSubmit} onCancel={jest.fn()} />);
    fireEvent.change(screen.getByRole('message-input'), { target: { value: 'Help' } });

    await click(screen.getByText('Submit'));

    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
