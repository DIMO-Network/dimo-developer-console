import { useState, type FC } from 'react';
import { signIn } from 'next-auth/react';

import { Anchor } from '@/components/Anchor';
import { CheckboxField } from '@/components/CheckboxField';
import { existUserEmailOrAddress } from '@/actions/user';
import { IAuth } from '@/types/auth';
import { SignInButtons } from '@/components/SignInButton';

interface IProps {
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

export const SignUpWith: FC<IProps> = ({ onNext }) => {
  const [acceptTerms, setAcceptTerms] = useState<boolean>(true);

  const handleAcceptTerms = () => {
    setAcceptTerms(!acceptTerms);
  };

  const handleCTA = async (app: string, auth?: Partial<IAuth>) => {
    if (app === 'credentials') {
      const { existItem } = await existUserEmailOrAddress(auth?.address ?? null, app);

      if (!existItem) {
        onNext('sign-up-with', auth ?? {});
        return;
      }
    }

    signIn(app, auth);
  };

  return (
    <>
      <section className="sign-up__buttons">
        <SignInButtons isSignIn={false} disabled={!acceptTerms} onCTA={handleCTA} />
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
            <Anchor
              href="https://docs.dimo.zone/dinc/developer-terms-of-service"
              className="grey underline"
              target="_blank"
            >
              terms of service
            </Anchor>{' '}
            and{' '}
            <Anchor
              href="https://dimo.zone/legal/privacy-policy"
              className="grey underline"
              target="_blank"
            >
              privacy policy
            </Anchor>
          </p>
        </div>
      </section>
    </>
  );
};
