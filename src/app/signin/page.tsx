import Image from 'next/image';

import { Anchor } from '@/components/Anchor';
import { SignInButtons } from '@/components/SignInButtons';
import BuildOnDIMO from '@/assets/images/build-on-dimo.png';

import './page.css';

export default function SignIn() {
  return (
    <main className="sign-in">
      <div className="sign-in__form">
        <div className="flex flex-col w-full max-w-sm gap-4 px-4 py-4">
          <article className="flex flex-col w-full items-center gap-4 pt-4">
            <Image src={BuildOnDIMO} alt="DIMO Logo" className="w-44 h-6" />
            <p className="text-3xl text-center px-10 leading-9">
              Welcome back!
            </p>
          </article>
          <SignInButtons isSignIn={true} />
          <div className="flex justify-center">
            <Anchor href="#" className="primary">
              Create an account
            </Anchor>
          </div>
        </div>
      </div>
    </main>
  );
}
