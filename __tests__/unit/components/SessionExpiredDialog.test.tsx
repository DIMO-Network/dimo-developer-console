import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

jest.mock('@/services/consoleSignIn', () => ({
  passkeyCredential: jest.fn(),
  sendEmailCode: jest.fn(),
  emailCodeCredential: jest.fn(),
  renewConsoleSession: jest.fn(),
}));
jest.mock('@/services/globalAccount', () => ({ getUserSubOrganization: jest.fn() }));
jest.mock('@sentry/nextjs', () => ({ captureException: jest.fn() }));

import * as Sentry from '@sentry/nextjs';
import {
  emailCodeCredential,
  passkeyCredential,
  renewConsoleSession,
  sendEmailCode,
} from '@/services/consoleSignIn';
import { getUserSubOrganization } from '@/services/globalAccount';
import { SessionExpiredDialog } from '@/components/SessionExpiredDialog';

const ACCOUNT = { email: 'sam@harness.dev', subOrganizationId: 'sub-sam' };
const CREDENTIAL = {
  credentialBundle: 'bundle',
  privateKey: 'key',
  sessionSeconds: 1800,
  expiry: Math.floor(Date.now() / 1000) + 1800,
};

const show = () => {
  const onRenewed = jest.fn();
  const onStale = jest.fn();
  const onSignOut = jest.fn();
  const view = render(
    <SessionExpiredDialog
      account={ACCOUNT}
      onRenewed={onRenewed}
      onStale={onStale}
      onSignOut={onSignOut}
    />,
  );
  return { onRenewed, onStale, onSignOut, view };
};
const hasPasskey = (value: boolean) =>
  (getUserSubOrganization as jest.Mock).mockResolvedValue({
    subOrganizationId: ACCOUNT.subOrganizationId,
    hasPasskey: value,
  });

describe('SessionExpiredDialog', () => {
  beforeEach(() => {
    (renewConsoleSession as jest.Mock).mockResolvedValue(true);
    (sendEmailCode as jest.Mock).mockResolvedValue('otp-1');
  });
  afterEach(() => jest.useRealTimers());

  it('says the session expired and offers the passkey when the account has one', async () => {
    hasPasskey(true);
    show();
    expect(screen.getByText('Your session expired')).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: 'Continue with passkey' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Email me a code instead' })).toBeEnabled();
    expect(getUserSubOrganization).toHaveBeenCalledWith(ACCOUNT.email);
  });

  it('renews the session with the passkey, for the same account', async () => {
    hasPasskey(true);
    (passkeyCredential as jest.Mock).mockResolvedValue(CREDENTIAL);
    const { onRenewed, onSignOut } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with passkey' }));
    await waitFor(() => expect(onRenewed).toHaveBeenCalledTimes(1));
    expect(passkeyCredential).toHaveBeenCalledWith(ACCOUNT.subOrganizationId);
    expect(renewConsoleSession).toHaveBeenCalledWith({
      account: ACCOUNT,
      credential: CREDENTIAL,
      signal: expect.any(AbortSignal),
    });
    expect(onSignOut).not.toHaveBeenCalled();
  });

  it("says a cancelled passkey prompt didn't work, without reporting it", async () => {
    hasPasskey(true);
    (passkeyCredential as jest.Mock).mockRejectedValue(
      Object.assign(new Error('cancelled'), { name: 'NotAllowedError' }),
    );
    const { onRenewed } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with passkey' }));
    expect(
      await screen.findByText(
        "Couldn't confirm your passkey. Try again, or use an email code.",
      ),
    ).toBeInTheDocument();
    expect(Sentry.captureException).not.toHaveBeenCalled();
    expect(onRenewed).not.toHaveBeenCalled();
  });

  it('offers only an email code when the account has no passkey', async () => {
    hasPasskey(false);
    show();
    expect(await screen.findByRole('button', { name: 'Email me a code' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Continue with passkey' })).toBeNull();
  });

  it('falls back to an email code when the account lookup fails', async () => {
    (getUserSubOrganization as jest.Mock).mockRejectedValue(new Error('down'));
    show();
    expect(await screen.findByRole('button', { name: 'Email me a code' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Continue with passkey' })).toBeNull();
  });

  it('sends a code only when asked, then renews the session with it', async () => {
    hasPasskey(false);
    (emailCodeCredential as jest.Mock).mockResolvedValue(CREDENTIAL);
    const { onRenewed } = show();
    const ask = await screen.findByRole('button', { name: 'Email me a code' });
    expect(sendEmailCode).not.toHaveBeenCalled();
    fireEvent.click(ask);
    expect(
      await screen.findByText(`We sent a 6-digit code to ${ACCOUNT.email}.`),
    ).toBeInTheDocument();
    expect(sendEmailCode).toHaveBeenCalledWith(ACCOUNT.email);
    const submit = screen.getByRole('button', { name: 'Continue' });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: '12 34 56' } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() => expect(onRenewed).toHaveBeenCalledTimes(1));
    expect(emailCodeCredential).toHaveBeenCalledWith({
      email: ACCOUNT.email,
      otpId: 'otp-1',
      otp: '123456',
    });
    expect(renewConsoleSession).toHaveBeenCalledWith({
      account: ACCOUNT,
      credential: CREDENTIAL,
      signal: expect.any(AbortSignal),
    });
  });

  it('says when a code is wrong and stays open', async () => {
    hasPasskey(false);
    (emailCodeCredential as jest.Mock).mockRejectedValue(new Error('invalid otp'));
    const { onRenewed } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Email me a code' }));
    fireEvent.change(await screen.findByLabelText('Code'), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByText("That code didn't work. Check it and try again."),
    ).toBeInTheDocument();
    expect(onRenewed).not.toHaveBeenCalled();
  });

  it('lets the user ask for a new code after 30 seconds', async () => {
    jest.useFakeTimers();
    hasPasskey(false);
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Email me a code' }));
    await screen.findByLabelText('Code');
    expect(screen.getByRole('button', { name: 'Send a new code in 30s' })).toBeDisabled();
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send a new code' }));
    await waitFor(() => expect(sendEmailCode).toHaveBeenCalledTimes(2));
  });

  it('reports a renewal that fails after the passkey, and stays open', async () => {
    hasPasskey(true);
    (passkeyCredential as jest.Mock).mockResolvedValue(CREDENTIAL);
    (renewConsoleSession as jest.Mock).mockRejectedValue(new Error('dex down'));
    const { onRenewed } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with passkey' }));
    expect(
      await screen.findByText("Couldn't sign you in again. Try again, or sign out."),
    ).toBeInTheDocument();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(onRenewed).not.toHaveBeenCalled();
  });

  it('tries the renewal again with the key already proven, without a second passkey prompt', async () => {
    hasPasskey(true);
    (passkeyCredential as jest.Mock).mockResolvedValue(CREDENTIAL);
    (renewConsoleSession as jest.Mock)
      .mockRejectedValueOnce(new Error('dex down'))
      .mockResolvedValueOnce(true);
    const { onRenewed } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with passkey' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(onRenewed).toHaveBeenCalledTimes(1));
    expect(passkeyCredential).toHaveBeenCalledTimes(1);
    expect(renewConsoleSession).toHaveBeenCalledTimes(2);
  });

  it('tries the renewal again without reusing a spent email code', async () => {
    hasPasskey(false);
    (emailCodeCredential as jest.Mock).mockResolvedValue(CREDENTIAL);
    (renewConsoleSession as jest.Mock)
      .mockRejectedValueOnce(new Error('dex down'))
      .mockResolvedValueOnce(true);
    const { onRenewed } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Email me a code' }));
    fireEvent.change(await screen.findByLabelText('Code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(onRenewed).toHaveBeenCalledTimes(1));
    expect(emailCodeCredential).toHaveBeenCalledTimes(1);
    expect(renewConsoleSession).toHaveBeenCalledTimes(2);
  });

  it('asks the provider to follow the shared session when it changed during the renewal', async () => {
    hasPasskey(true);
    (passkeyCredential as jest.Mock).mockResolvedValue(CREDENTIAL);
    (renewConsoleSession as jest.Mock).mockResolvedValue(false);
    const { onRenewed, onStale } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with passkey' }));
    await waitFor(() => expect(onStale).toHaveBeenCalledTimes(1));
    expect(onRenewed).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('starts over, rather than renew with a key about to expire', async () => {
    hasPasskey(true);
    (passkeyCredential as jest.Mock).mockResolvedValue({
      ...CREDENTIAL,
      expiry: Math.floor(Date.now() / 1000) + 30,
    });
    (renewConsoleSession as jest.Mock).mockRejectedValue(new Error('dex down'));
    show();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with passkey' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByText('That took too long. Start again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue with passkey' })).toBeEnabled();
    expect(renewConsoleSession).toHaveBeenCalledTimes(1);
  });

  it('stops a renewal in flight when the dialog closes', async () => {
    hasPasskey(true);
    (passkeyCredential as jest.Mock).mockResolvedValue(CREDENTIAL);
    (renewConsoleSession as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { view } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with passkey' }));
    await waitFor(() => expect(renewConsoleSession).toHaveBeenCalledTimes(1));
    const { signal } = (renewConsoleSession as jest.Mock).mock.calls[0][0];
    expect(signal.aborted).toBe(false);
    view.unmount();
    expect(signal.aborted).toBe(true);
  });

  it('keeps Sign out available while a request hangs', async () => {
    hasPasskey(true);
    (passkeyCredential as jest.Mock).mockReturnValue(new Promise(() => {}));
    const { onSignOut } = show();
    fireEvent.click(await screen.findByRole('button', { name: 'Continue with passkey' }));
    const signOut = screen.getByRole('button', { name: 'Sign out' });
    expect(signOut).toBeEnabled();
    fireEvent.click(signOut);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });

  it('signs out when asked', async () => {
    hasPasskey(true);
    const { onSignOut } = show();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
