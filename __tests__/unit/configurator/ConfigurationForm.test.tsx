import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { ConfigurationForm } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm';
import { DynamicFormProps } from '@/app/license/[tokenId]/configurator/components/ConfigurationForm/types';

jest.mock('@/gql', () => ({
  gql: (s: unknown) => s,
  useFragment: (_d: unknown, f: unknown) => f,
}));
jest.mock('@/actions/brand', () => ({ fetchMyBrands: jest.fn().mockResolvedValue([]) }));
jest.mock('@/actions/workspace', () => ({
  getWorkspaceByTokenId: jest.fn().mockResolvedValue(null),
  getWorkspace: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/hooks/useTeam', () => ({ useTeam: () => ({ isOwner: true }) }));
jest.mock('react-syntax-highlighter', () => ({
  Prism: ({ children }: { children: string }) => <pre>{children}</pre>,
}));
jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({ oneDark: {} }));

const license = {
  tokenId: 42,
  clientId: '0xclient',
  owner: '0x1',
  redirectURIs: { nodes: [{ uri: 'https://app.example/callback' }] },
};

const nextWeek = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 7);
  return date.toISOString();
};

const renderForm = (values: Partial<DynamicFormProps>, submit = jest.fn()) => {
  const Form = () => {
    const methods = useForm<DynamicFormProps>({
      defaultValues: {
        configuration_name: 'My config',
        redirectUri: 'https://app.example/callback',
        language: '',
        emailRequest: 'optional',
        ...values,
      } as DynamicFormProps,
    });
    return (
      <FormProvider {...methods}>
        <ConfigurationForm license={license as never} submit={submit} />
      </FormProvider>
    );
  };
  render(<Form />);
  return submit;
};

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));

describe('ConfigurationForm', () => {
  it('needs a template ID for a template share', async () => {
    const submit = renderForm({
      component: 'ShareVehiclesWithDimo',
      permissionsMode: 'template',
      expirationDate: nextWeek(),
    });
    save();
    expect(
      await screen.findByText('Enter a permissions template ID'),
    ).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('needs at least one custom permission', async () => {
    const submit = renderForm({
      component: 'ShareVehiclesWithDimo',
      permissionsMode: 'custom',
      permissions: [],
      expirationDate: nextWeek(),
    });
    save();
    expect(await screen.findByText('Choose at least one permission')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Non Location Telemetry/ }));
    save();
    await waitFor(() => expect(submit).toHaveBeenCalled());
  });

  it('needs a redirect URI', async () => {
    const submit = renderForm({ component: 'LoginWithDimo', redirectUri: '' });
    save();
    expect(await screen.findByText('Redirect URI is required')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('saves a plain login without an end date', async () => {
    const submit = renderForm({ component: 'LoginWithDimo' });
    save();
    await waitFor(() => expect(submit).toHaveBeenCalled());
  });

  it('needs an end date for a share, and not a past one', async () => {
    const submit = renderForm({
      component: 'ShareVehiclesWithDimo',
      permissionsMode: 'template',
      permissionTemplateId: '1',
    });
    save();
    expect(await screen.findByText('Expiration date is required')).toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('closes the date picker on a pick and offers no past days', async () => {
    renderForm({ component: 'ShareVehiclesWithDimo', permissionsMode: 'template' });
    fireEvent.click(screen.getByRole('textbox', { name: /Expiration date/ }));
    const next = screen.getByRole('button', { name: 'Next month' });
    fireEvent.click(next);
    // Any day next month is in the future.
    const calendar = next.closest('.absolute') as HTMLElement;
    fireEvent.click(within(calendar).getByRole('button', { name: '15' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Next month' })).toBeNull(),
    );

    fireEvent.click(screen.getByRole('textbox', { name: /Expiration date/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('button', { name: '15' })).toBeDisabled();
  });
});
