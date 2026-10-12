'use client';
import { type FC, useEffect, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import './BrandLockup.css';

interface IProps {
  product: string;
}

const useIsomorphicLayoutEffect =
  typeof window === 'undefined' ? useEffect : useLayoutEffect;

// "Developer Console" is a product name: shown as-is, never re-cased.
// A browser minimum font size (Safari's "Never use font sizes smaller than")
// can make the name wider than the lockup's box. The lockup then scales down
// as a whole to fit: it never wraps and never runs past its container.
export const BrandLockup: FC<IProps> = ({ product }) => {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      const k = el.clientWidth / el.scrollWidth;
      el.style.transform = k < 1 ? `scale(${k})` : '';
    };
    fit();
    let live = true;
    document.fonts?.ready.then(() => live && fit());
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit);
    ro?.observe(el);
    return () => {
      live = false;
      ro?.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className="brand-lockup">
      <Image
        src="/images/dimo-wordmark.svg"
        alt="DIMO"
        width={80}
        height={18}
        className="wordmark"
        priority
      />
      <span className="product">{product}</span>
    </div>
  );
};
