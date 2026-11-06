'use client';
import { useCallback, useLayoutEffect, useState } from 'react';
import * as Sentry from '@sentry/nextjs';

// Whether this browser can sign in with a passkey. Its own module, apart from
// usePasskey: the sign-in page asks only this, and usePasskey brings Turnkey.
export const usePasskeyAvailability = () => {
  const [isPasskeyAvailable, setIsPasskeyAvailable] = useState<boolean | null>(null);

  const validatePasskeyAvailability = useCallback(async (): Promise<boolean> => {
    // Availability of "window.PublicKeyCredential" means WebAuthn is usable.
    if (typeof window === 'undefined' || !window.PublicKeyCredential) return false;
    try {
      // "isUserVerifyingPlatformAuthenticatorAvailable" means the feature detection is usable.
      if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
        return false;

      // "isConditionalMediationAvailable" means the feature detection is usable.
      if (!PublicKeyCredential.isConditionalMediationAvailable) return false;

      // Check if user verifying platform authenticator is available.
      const results = await Promise.allSettled([
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.(),
        PublicKeyCredential.isConditionalMediationAvailable?.(),
      ]);

      return results.every(
        (result: PromiseSettledResult<boolean>) =>
          result.status === 'fulfilled' && result.value,
      );
    } catch (e: unknown) {
      Sentry.captureException(e);
      return false;
    }
  }, []);

  useLayoutEffect(() => {
    validatePasskeyAvailability().then((isAvailable) => {
      setIsPasskeyAvailable(isAvailable);
    });
  }, []);

  return { isPasskeyAvailable };
};

export default usePasskeyAvailability;
