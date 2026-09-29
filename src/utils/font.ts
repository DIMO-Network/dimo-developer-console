import localFont from 'next/font/local';

// Euclid Circular A, as in the DIMO Driver app and DIMO Fleet.
export const dimoFont = localFont({
  src: [
    {
      path: './../assets/fonts/EuclidCircularA-Regular.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: './../assets/fonts/EuclidCircularA-Medium.woff2',
      weight: '500',
      style: 'normal',
    },
    {
      path: './../assets/fonts/EuclidCircularA-Semibold.woff2',
      weight: '600',
      style: 'normal',
    },
    {
      path: './../assets/fonts/EuclidCircularA-Bold.woff2',
      weight: '700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-dimo',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});
