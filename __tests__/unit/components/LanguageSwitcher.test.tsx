import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { setLocale } from '@/i18n/actions';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));
jest.mock('@/i18n/actions', () => ({ setLocale: jest.fn(async () => undefined) }));

describe('LanguageSwitcher', () => {
  it('offers every locale by its native name, tagged with its language', () => {
    render(<LanguageSwitcher variant="menu" />);
    const select = screen.getByRole('combobox', { name: 'Language' });
    const options = within(select).getAllByRole('option');
    expect(
      options.map((option) => [option.textContent, option.getAttribute('lang')]),
    ).toEqual([
      ['English', 'en'],
      ['Español', 'es'],
      ['日本語', 'ja'],
      ['简体中文', 'zh-Hans'],
      ['繁體中文', 'zh-Hant'],
    ]);
    expect(select).toHaveValue('en');
  });

  it('shows the current language in the menu', () => {
    render(<LanguageSwitcher variant="menu" />);
    expect(screen.getByText('English', { selector: 'span' })).toHaveAttribute(
      'lang',
      'en',
    );
  });

  it('keeps only the icon when the sidebar is collapsed', () => {
    render(<LanguageSwitcher variant="menu" collapsed />);
    expect(screen.queryByText('English', { selector: 'span' })).not.toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveAttribute(
      'title',
      'Language',
    );
  });

  it('icon variant is labelled for screen readers', () => {
    render(<LanguageSwitcher variant="icon" />);
    expect(screen.getByRole('combobox', { name: 'Language' })).toBeInTheDocument();
    expect(screen.queryByText('English', { selector: 'span' })).not.toBeInTheDocument();
  });

  it('stores the choice and leaves the re-render to the Server Action', async () => {
    render(<LanguageSwitcher variant="menu" />);
    const select = screen.getByRole('combobox', { name: 'Language' });
    fireEvent.change(select, { target: { value: 'zh-Hant' } });
    await waitFor(() => expect(select).toHaveAttribute('aria-busy', 'false'));
    expect(setLocale).toHaveBeenCalledWith('zh-Hant');
    // Next re-renders after a Server Action sets a cookie; a refresh would be a
    // second server render.
    expect(refresh).not.toHaveBeenCalled();
  });

  it('keeps focus while the choice is saved, and ignores changes until then', async () => {
    let finish = () => {};
    jest
      .mocked(setLocale)
      .mockImplementationOnce(() => new Promise<void>((resolve) => (finish = resolve)));
    render(<LanguageSwitcher variant="menu" />);
    const select = screen.getByRole('combobox', { name: 'Language' });
    select.focus();

    fireEvent.change(select, { target: { value: 'ja' } });
    await waitFor(() => expect(select).toHaveAttribute('aria-busy', 'true'));
    expect(select).toBeEnabled();
    expect(select).toHaveFocus();

    fireEvent.change(select, { target: { value: 'es' } });
    expect(setLocale).toHaveBeenCalledTimes(1);
    expect(setLocale).toHaveBeenCalledWith('ja');

    await act(async () => finish());
    await waitFor(() => expect(select).toHaveAttribute('aria-busy', 'false'));
    expect(setLocale).toHaveBeenCalledTimes(1);
  });
});
