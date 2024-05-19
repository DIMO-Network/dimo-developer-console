import { Anchor } from '@/components/Anchor';
import { CheckboxField } from '@/components/CheckboxField';
import { SignInButtons } from '@/components/SignInButton';
import { useState } from 'react';

export const SignUpWith = () => {
  const [acceptTerms, setAcceptTerms] = useState<boolean>(true);

  const handleAcceptTerms = () => {
    setAcceptTerms(!acceptTerms);
  };
  return (
    <>
      <section className="sign-up__buttons">
        <SignInButtons isSignIn={false} disabled={!acceptTerms} />
      </section>
      <section className="sign-up__extra-links">
        <Anchor href="/sign-in" className="primary">
          Already have an account?
        </Anchor>
        <div className="flex flex-row">
          <CheckboxField
            name="terms"
            checked={acceptTerms}
            onChange={handleAcceptTerms}
            className={acceptTerms ? '' : 'required'}
          />
          <p className="terms-caption">
            by signing up, you are agreeing to our{' '}
            <Anchor href="#" className="grey underline">
              terms of service
            </Anchor>{' '}
            and{' '}
            <Anchor href="#" className="grey underline">
              privacy policy
            </Anchor>
          </p>
        </div>
      </section>
    </>
  );
};
