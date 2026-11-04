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
  onRenewed: () => void;
  onSignOut: () => void;
}

const isUsable = (
  credential: TurnkeyCredential | null,
): credential is TurnkeyCredential =>
  !!credential && credential.expiry > Date.now() / 1000;

// Shown over the page when the session expires: sign in again as the same
// account, with the passkey or an emailed code, without leaving the page.
// Nothing is sent or prompted until the user asks: the session can expire
// while they are away, and a passkey prompt needs a click.
export const SessionExpiredDialog: FC<Props> = ({ account, onRenewed, onSignOut }) => {
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  // A key the user already proved (passkey or code) whose renewal failed
  // after it: trying again reuses it, without a second prompt or a spent code.
  const [proven, setProven] = useState<TurnkeyCredential | null>(null);

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
    let renewed: boolean;
    try {
      renewed = await renewConsoleSession({ account, credential });
    } catch (renewError) {
      captureException(renewError);
      setProven(credential);
      setError(RENEW_FAILED);
      return;
    }
    setProven(null);
    // false: another tab signed out or in as someone else meanwhile, and this
    // tab is already following it.
    if (renewed) onRenewed();
  };

  const run = async (step: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await step();
    } finally {
      setBusy(false);
    }
  };

  const tryAgain = () =>
    run(async () => {
      if (isUsable(proven)) return renew(proven);
      setProven(null);
    });

  const withPasskey = () =>
    run(async () => {
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
    });

  const sendCode = () =>
    run(async () => {
      try {
        setOtpId(await sendEmailCode(account.email));
        setCode('');
        setSentAt(Date.now());
        setNow(Date.now());
      } catch (sendError) {
        captureException(sendError);
        setError(SEND_FAILED);
      }
    });

  const withCode = () =>
    run(async () => {
      if (!otpId) return;
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
    });

  const resendIn = Math.max(0, RESEND_AFTER_SECONDS - Math.floor((now - sentAt) / 1000));

  const choices = () => {
    if (proven) {
      return (
        <Button loading={busy} onClick={() => void tryAgain()}>
          Try again
        </Button>
      );
    }
    if (otpId) {
      return (
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
      );
    }
    if (hasPasskey === null) return null;
    if (hasPasskey) {
      return (
        <>
          <Button loading={busy} onClick={() => void withPasskey()}>
            Continue with passkey
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => void sendCode()}>
            Email me a code instead
          </Button>
        </>
      );
    }
    return (
      <Button loading={busy} onClick={() => void sendCode()}>
        Email me a code
      </Button>
    );
  };

  return (
    <Modal isOpen setIsOpen={() => {}} showClose={false}>
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          Your session expired
        </Title>
        {!otpId && !proven && (
          <p className="text-muted">
            Sign in again as {account.email} to keep working. You&apos;ll stay on this
            page.
          </p>
        )}
        {choices()}
        {error && (
          <p role="alert" className="text-body-sm text-negative">
            {error}
          </p>
        )}
        {/* Always available: a hung request must not trap the user here. */}
        <Button variant="ghost" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </Modal>
  );
};

export default SessionExpiredDialog;
