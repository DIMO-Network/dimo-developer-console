'use client';

import { FC, useEffect, useState } from 'react';
import { captureException } from '@sentry/nextjs';
import { Modal } from '@/components/Modal';
import { Title } from '@/components/Title';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import {
  emailCodeCredential,
  passkeyCredential,
  renewConsoleSession,
  sendEmailCode,
  type ConsoleAccount,
  type TurnkeyCredential,
} from '@/services/consoleSignIn';
import { getUserSubOrganization } from '@/services/globalAccount';

const RESEND_AFTER_SECONDS = 30;

export const PASSKEY_FAILED =
  "Couldn't confirm your passkey. Try again, or use an email code.";
export const CODE_FAILED = "That code didn't work. Check it and try again.";
export const SEND_FAILED = "Couldn't send a code. Try again.";
export const RENEW_FAILED = "Couldn't sign you in again. Try again, or sign out.";

interface Props {
  account: ConsoleAccount;
  // The wallet the console already knows for this account, so renewing doesn't
  // complete the account again.
  currentWallet: `0x${string}` | null;
  onRenewed: () => void;
  onSignOut: () => void;
}

// Shown over the page when the session expires: sign in again as the same
// account, with the passkey or an emailed code, without leaving the page.
// Nothing is sent or prompted until the user asks: the session can expire
// while they are away, and a passkey prompt needs a click.
export const SessionExpiredDialog: FC<Props> = ({
  account,
  currentWallet,
  onRenewed,
  onSignOut,
}) => {
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let current = true;
    getUserSubOrganization(account.email)
      .then((found) => current && setHasPasskey(!!found?.hasPasskey))
      // An email code works for every account.
      .catch(() => current && setHasPasskey(false));
    return () => {
      current = false;
    };
  }, [account.email]);

  // The resend countdown.
  useEffect(() => {
    if (!otpId) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [otpId]);

  const renew = async (credential: TurnkeyCredential) => {
    try {
      await renewConsoleSession({
        account,
        credential,
        currentWalletValue: currentWallet,
      });
    } catch (renewError) {
      captureException(renewError);
      setError(RENEW_FAILED);
      return;
    }
    onRenewed();
  };

  const withPasskey = async () => {
    setBusy(true);
    setError(null);
    try {
      let credential: TurnkeyCredential | null;
      try {
        credential = await passkeyCredential(account.subOrganizationId);
      } catch (passkeyError) {
        // NotAllowedError: the user closed the prompt or it timed out.
        if ((passkeyError as Error)?.name !== 'NotAllowedError') {
          captureException(passkeyError);
        }
        credential = null;
      }
      if (!credential) {
        setError(PASSKEY_FAILED);
        return;
      }
      await renew(credential);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      setOtpId(await sendEmailCode(account.email));
      setCode('');
      setSentAt(Date.now());
      setNow(Date.now());
    } catch (sendError) {
      captureException(sendError);
      setError(SEND_FAILED);
    } finally {
      setBusy(false);
    }
  };

  const withCode = async () => {
    if (!otpId) return;
    setBusy(true);
    setError(null);
    try {
      let credential: TurnkeyCredential | null;
      try {
        credential = await emailCodeCredential({
          email: account.email,
          otpId,
          otp: code,
        });
      } catch {
        // A wrong or used code; nothing to report.
        credential = null;
      }
      if (!credential) {
        setError(CODE_FAILED);
        return;
      }
      await renew(credential);
    } finally {
      setBusy(false);
    }
  };

  const resendIn = Math.max(0, RESEND_AFTER_SECONDS - Math.floor((now - sentAt) / 1000));

  return (
    <Modal isOpen setIsOpen={() => {}} showClose={false}>
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          Your session expired
        </Title>
        {otpId ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              void withCode();
            }}
          >
            <p className="text-muted">We sent a 6-digit code to {account.email}.</p>
            <label htmlFor="session-expired-code" className="text-body-sm text-fg">
              Code
            </label>
            <TextField
              id="session-expired-code"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
            />
            <Button type="submit" loading={busy} disabled={code.length !== 6}>
              Continue
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={busy || resendIn > 0}
              onClick={() => void sendCode()}
            >
              {resendIn > 0 ? `Send a new code in ${resendIn}s` : 'Send a new code'}
            </Button>
          </form>
        ) : (
          <>
            <p className="text-muted">
              Sign in again as {account.email} to keep working. You&apos;ll stay on this
              page.
            </p>
            {hasPasskey === null ? null : hasPasskey ? (
              <>
                <Button loading={busy} onClick={() => void withPasskey()}>
                  Continue with passkey
                </Button>
                <Button variant="ghost" disabled={busy} onClick={() => void sendCode()}>
                  Email me a code instead
                </Button>
              </>
            ) : (
              <Button loading={busy} onClick={() => void sendCode()}>
                Email me a code
              </Button>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="text-body-sm text-negative">
            {error}
          </p>
        )}
        <Button variant="ghost" disabled={busy} onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </Modal>
  );
};

export default SessionExpiredDialog;
