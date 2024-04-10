import Image from 'next/image';

import { SignInForm } from '@/app/signin/components/SignInForm';
import { Card } from '@/components/Card';
import DimoLogo from '@/assets/logo.png';

export default function SignIn() {
  return (
    <main className="flex flex-col items-center justify-center h-screen gap-4">
      <Card className="flex flex-col max-w-sm gap-4">
        <article className="flex flex-col w-full items-center gap-4 pt-4">
          <Image src={DimoLogo} alt="DIMO Logo" className="w-24 h-4" />
          <p className='text-2xl text-center font-medium px-10'>Sign in to your developer account</p>
        </article>
        <article className="flex flex-col w-full">
          <SignInForm />
        </article>
      </Card>
    </main>
  );
}
