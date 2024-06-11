import { render, screen } from '@testing-library/react';

import { UserForm } from '@/app/app/settings/components/UserForm';

describe('UserForm', () => {
  it('renders user form on the settings page', () => {
    render(
      <UserForm
        user={{
          name: 'John Doe',
          email: 'jhondoe@gmail.com',
          auth: 'github',
          auth_login: 'jhondoe@gmail.com',
        }}
      />
    );

    const nameElm = screen.getByRole('user-name-input') as HTMLInputElement;
    const loginElm = screen.getByRole('user-login-input') as HTMLInputElement;
    const emailElm = screen.getByRole('user-email-input') as HTMLInputElement;

    expect(nameElm).toBeInTheDocument();
    expect(nameElm.value).toBe('John Doe');

    expect(loginElm).toBeInTheDocument();
    expect(loginElm.value).toBe('jhondoe@gmail.com');

    expect(emailElm).toBeInTheDocument();
    expect(emailElm.value).toBe('jhondoe@gmail.com');
  });
});
