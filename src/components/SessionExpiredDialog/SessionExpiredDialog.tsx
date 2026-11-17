'use client';

import { useTranslations } from 'next-intl';
import { FC, useEffect, useRef, useState } from 'react';
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
  SignedInElsewhereError,
  type ConsoleAccount,
  type TurnkeyCredential,
} from '@/services/consoleSignIn';
import { getUserSubOrganization } from '@/services/globalAccount';
import { usePasskey } from '@/hooks/usePasskey';
import { isUnexpectedFailure, reportUnexpected } from '@/utils/upstreamErrors';

const RESEND_AFTER_SECONDS = 30;
// Past this, the dialog offers the email code without waiting for the lookup.
const LOOKUP_TIMEOUT_MS = 5_000;

// Message keys in the common namespace; the error state holds one and the
// dialog translates it.
export const PASSKEY_FAILED = 'sessionExpired.errors.passkeyFailed';
export const CODE_FAILED = 'sessionExpired.errors.codeFailed';
export const CODE_CHECK_FAILED = 'sessionExpired.errors.codeCheckFailed';
export const SEND_FAILED = 'sessionExpired.errors.sendFailed';
export const RENEW_FAILED = 'sessionExpired.errors.renewFailed';
export const START_AGAIN = 'sessionExpired.errors.startAgain';
export const SIGNED_IN_ELSEWHERE = 'sessionExpired.errors.signedInElsewhere';

// A proven key with less left than this is not worth renewing with: the new
// session keeps the key's expiry.
const MIN_KEY_SECONDS_LEFT = 60;

interface Props {
  account: ConsoleAccount;
  onRenewed: () => void;
  // The shared session changed while renewing (another tab signed out, or in
  // as someone else): the provider checks it and follows.
  onStale: () => void;
  onSignOut: () => void;
}

const isUsable = (
  credential: TurnkeyCredential | null,
): credential is TurnkeyCredential =>
  !!credential && credential.expiry - Date.now() / 1000 > MIN_KEY_SECONDS_LEFT;

// Shown over the page when the session expires: sign in again as the same
// account, with the passkey or an emailed code, without leaving the page.
// Nothing is sent or prompted until the user asks: the session can expire
// while they are away, and a passkey prompt needs a click.
export const SessionExpiredDialog: FC<Props> = ({
  account,
  onRenewed,
  onStale,
  onSignOut,
}) => {
  const t = useTranslations('common');
  const [hasPasskey, setHasPasskey] = useState<boolean | null>(null);
  // Like the sign-in page: a passkey only where this browser can use one.
  const { isPasskeyAvailable } = usePasskey();
  const [otpId, setOtpId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  // Once the user signs out, nothing else may start: no code is emailed and
  // no passkey prompt opens for an account on its way out.
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  // A key the user already proved (passkey or code) whose renewal failed
  // after it: trying again reuses it, without a second prompt or a spent code.
  const [proven, setProven] = useState<TurnkeyCredential | null>(null);
  // Stops a renewal in flight when the dialog closes or the user signs out,
  // so its cookie isn't set behind them.
  const closing = useRef<AbortController | null>(null);
  const closingController = () => (closing.current ??= new AbortController());
  useEffect(() => {
    // A fresh one per mount: React's development double mount aborts the first.
    const controller = new AbortController();
    closing.current = controller;
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let current = true;
    getUserSubOrganization(account.email, { timeout: LOOKUP_TIMEOUT_MS })
      .then((found) => current && setHasPasskey(!!found?.hasPasskey))
      // An email code works for every account.
      .catch(() => current && setHasPasskey(false));
    return () => {
      current = false;
    };
  }, [account.email]);

  // The resend countdown, until it reaches zero.
  const waiting = !!otpId && now - sentAt < RESEND_AFTER_SECONDS * 1000;
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [waiting]);

  const renew = async (credential: TurnkeyCredential) => {
    const { signal } = closingController();
    let renewed: boolean;
    try {
      renewed = await renewConsoleSession({ account, credential, signal });
    } catch (renewError) {
      if (signal.aborted) return;
      if (renewError instanceof SignedInElsewhereError) {
        // Trying again would meet the same cookie.
        setProven(null);
        setError(SIGNED_IN_ELSEWHERE);
        return;
      }
      captureException(renewError);
      setProven(credential);
      setError(RENEW_FAILED);
      return;
    }
    // Closed or signing out meanwhile: the provider that asked is gone or
    // leaving, and has nothing left to hear.
    if (signal.aborted) return;
    setProven(null);
    if (renewed) onRenewed();
    else onStale();
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

  const signOut = () => {
    setSigningOut(true);
    closingController().abort();
    onSignOut();
  };

  // Back to the choices, for another passkey prompt or a new code.
  const startOver = () => {
    setProven(null);
    setOtpId(null);
    setCode('');
    setError(null);
  };

  const tryAgain = () =>
    run(async () => {
      if (isUsable(proven)) return renew(proven);
      // Too old to renew with: back to the start, without the spent code.
      setProven(null);
      setOtpId(null);
      setCode('');
      setError(START_AGAIN);
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
      } catch (codeError) {
        // A refusal is a wrong or used code, nothing to report. Anything else
        // (no answer, a 5xx) is not the code's fault: say so, and report it.
        if (isUnexpectedFailure(codeError)) {
          reportUnexpected(codeError);
          setError(CODE_CHECK_FAILED);
          return;
        }
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
        <>
          <Button loading={busy} disabled={signingOut} onClick={() => void tryAgain()}>
            {t('sessionExpired.tryAgain')}
          </Button>
          <Button variant="ghost" disabled={busy || signingOut} onClick={startOver}>
            {t('sessionExpired.startOver')}
          </Button>
        </>
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
          <p className="text-muted">
            {t('sessionExpired.codeSent', { email: account.email })}
          </p>
          <label htmlFor="session-expired-code" className="text-body-sm text-fg">
            {t('sessionExpired.codeLabel')}
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
            disabled={signingOut}
          />
          <Button type="submit" loading={busy} disabled={code.length !== 6 || signingOut}>
            {t('sessionExpired.continue')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={busy || signingOut || resendIn > 0}
            onClick={() => void sendCode()}
          >
            {resendIn > 0
              ? t('sessionExpired.resendIn', { seconds: resendIn })
              : t('sessionExpired.resend')}
          </Button>
        </form>
      );
    }
    if (hasPasskey === null || isPasskeyAvailable === null) return null;
    if (hasPasskey && isPasskeyAvailable) {
      return (
        <>
          <Button loading={busy} disabled={signingOut} onClick={() => void withPasskey()}>
            {t('sessionExpired.withPasskey')}
          </Button>
          <Button
            variant="ghost"
            disabled={busy || signingOut}
            onClick={() => void sendCode()}
          >
            {t('sessionExpired.emailInstead')}
          </Button>
        </>
      );
    }
    return (
      <Button loading={busy} disabled={signingOut} onClick={() => void sendCode()}>
        {t('sessionExpired.emailCode')}
      </Button>
    );
  };

  return (
    // An opaque backdrop: a dialog the page had open shows nothing behind it.
    <Modal
      isOpen
      setIsOpen={() => {}}
      showClose={false}
      overlayClassName="bg-background backdrop-blur-none"
    >
      <div className="flex flex-col gap-4">
        <Title component="h2" className="text-panel-title text-ink">
          {t('sessionExpired.title')}
        </Title>
        {!otpId && !proven && (
          <p className="text-muted">
            {t('sessionExpired.description', { email: account.email })}
          </p>
        )}
        {choices()}
        {error && (
          <p role="alert" className="text-body-sm text-negative">
            {t(error)}
          </p>
        )}
        {/* Always available: a hung request must not trap the user here. */}
        <Button variant="ghost" loading={signingOut} onClick={signOut}>
          {t('sessionExpired.signOut')}
        </Button>
      </div>
    </Modal>
  );
};

export default SessionExpiredDialog;
