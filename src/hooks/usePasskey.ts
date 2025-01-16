'use client';
import { useEffect, useState } from 'react';

export const usePasskey = () => {
  const [isPasskeyAvailable, setIsPasskeyAvailable] = useState<boolean>(false);

  const validatePasskeyAvailability = async () => {
    // Availability of `window.PublicKeyCredential` means WebAuthn is usable.
    // `isUserVerifyingPlatformAuthenticatorAvailable` means the feature detection is usable.
    // `​​isConditionalMediationAvailable` means the feature detection is usable.

    if (!window.PublicKeyCredential) return false;
    if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable)
      return false;
    if (!PublicKeyCredential.isConditionalMediationAvailable) return false;

    // Check if user verifying platform authenticator is available.
    const results = await Promise.all([
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
      PublicKeyCredential.isConditionalMediationAvailable(),
    ]);

    return results.every((r) => r === true);
  };

  useEffect(() => {
    validatePasskeyAvailability().then((isAvailable) => {
      setIsPasskeyAvailable(isAvailable);
    });
  }, []);

  return { isPasskeyAvailable };
};

export default usePasskey;
