import { type FC } from 'react';
import Image from 'next/image';
import './BrandLockup.css';

interface IProps {
  product: string;
}

// "Developer Console" is a product name: shown as-is, never re-cased.
export const BrandLockup: FC<IProps> = ({ product }) => (
  <div className="brand-lockup">
    <Image
      src="/images/dimo-wordmark.png"
      alt="DIMO"
      width={69}
      height={18}
      className="wordmark"
      priority
    />
    <span className="product">{product}</span>
  </div>
);
