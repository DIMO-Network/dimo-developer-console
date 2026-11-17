import { fireEvent, render, screen, within } from '@testing-library/react';

import { CompanyInfoForm } from '@/app/sign-up/components/CompanyInfoForm';
import { DEVELOPER_TYPES, REGIONS } from '@/config/default';
import messages from '../../../../messages/en/sign-up.json';

const optionsOf = (role: string) =>
  within(screen.getByRole(role))
    .getAllByRole('option')
    .filter((option) => option.getAttribute('value'))
    .map((option) => [option.getAttribute('value'), option.textContent]);

// The values are what the API stores (and 'Personal Developer' picks the form),
// so they stay English; only the labels come from messages.
describe('CompanyInfoForm options', () => {
  it('labels each developer type from messages and sends the English value', () => {
    render(<CompanyInfoForm onNext={jest.fn()} />);
    expect(optionsOf('company-type-select')).toEqual(
      DEVELOPER_TYPES.map((type, i) => [
        type,
        Object.values(messages.company.developerTypes)[i],
      ]),
    );
    // The English labels read as the values did.
    expect(Object.values(messages.company.developerTypes)).toEqual(DEVELOPER_TYPES);
  });

  it('labels each region from messages and sends the English value', () => {
    render(<CompanyInfoForm onNext={jest.fn()} />);
    const menu = screen.getByRole('company-type');
    fireEvent.click(within(menu).getByText('OEM', { selector: '.custom-item' }));
    expect(optionsOf('company-region-select')).toEqual(
      REGIONS.map((region, i) => [region, Object.values(messages.company.regions)[i]]),
    );
    expect(Object.values(messages.company.regions)).toEqual(REGIONS.map((r) => r.trim()));
  });
});
