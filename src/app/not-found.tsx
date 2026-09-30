import { type Metadata } from 'next';
import Link from 'next/link';

import { BrandLockup } from '@/components/BrandLockup';
import { ThemeToggle } from '@/components/ThemeToggle';
import configuration from '@/config';

// Link styled as the primary Button; the class rules live with Button.
import '@/components/Button/Button.css';

export const metadata: Metadata = {
  title: `404 | ${configuration.appName}`,
};

// Rendered for any unmatched URL with only the root layout around it, so it
// draws its own canvas and panel (same look as the guest pages).
const NotFound = () => (
  <main className="relative flex min-h-screen flex-col items-center justify-center bg-canvas bg-brand-glow px-4 py-12">
    <div className="absolute right-4 top-4">
      <ThemeToggle variant="icon" />
    </div>
    <div className="flex w-full max-w-[480px] flex-col items-center gap-8 rounded-panel bg-sheet p-6 text-center shadow-float md:p-10">
      <BrandLockup product="Developer Console" />
      <div>
        <p className="text-label text-muted">404</p>
        <h1 className="mt-4 text-title text-ink">Page not found</h1>
        <p className="mt-6 text-body text-muted">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
      </div>
      <Link href="/" className="button primary">
        Go back home
      </Link>
    </div>
  </main>
);

export default NotFound;
