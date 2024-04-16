
import { Anchor } from '@/components/Anchor';
import { SignInButtons } from '@/components/SignInButton';

export const SignUpWith = () => {
  return (
    <>
      <section className="sign-up__buttons">
        <SignInButtons isSignIn={false} />
      </section>
      <section className="sign-up__extra-links">
        <Anchor href="/sign-in" className="primary">
          Already have an account?
        </Anchor>
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
      </section>
    </>
  );
};
