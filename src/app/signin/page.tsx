import Image from 'next/image';

import { SignInForm } from '@/app/signin/components/SignInForm';
import DimoLogo from '@/assets/logo.png';

export default function SignIn() {
  return (
    <main className="flex flex-col items-center justify-center h-screen gap-4">
      <article className="flex flex-col w-3/12 gap-4 items-center">
        <Image src={DimoLogo} alt="DIMO Logo" className="w-40 h-10" />
        <p>Sign in to your DIMO Developer account</p>
      </article>
      <article className="flex flex-col w-3/12">
        <SignInForm />
      </article>
    </main>
  );
}
