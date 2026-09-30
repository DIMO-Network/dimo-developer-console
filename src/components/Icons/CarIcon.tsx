import type { FC } from 'react';
import React from 'react';
import { IconProps } from './index';

export const CarIcon: FC<IconProps> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 16.5v-4.25L6.75 8h10.5L19 12.25v4.25M3.75 16.5h16.5M6.5 16.5v2.25M17.5 16.5v2.25M7.5 13.5h.01M16.5 13.5h.01"
    />
  </svg>
);

export default CarIcon;
