import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const DeveloperBoardIcon: FC<IconProps> = ({ className }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 20 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="developer-board-icon"
    >
      <path
        d="M20 6V4H18V2C18 0.9 17.1 0 16 0H2C0.9 0 0 0.9 0 2V16C0 17.1 0.9 18 2 18H16C17.1 18 18 17.1 18 16V14H20V12H18V10H20V8H18V6H20ZM16 16H2V2H16V16ZM4 10H9V14H4V10ZM10 4H14V7H10V4ZM4 4H9V9H4V4ZM10 8H14V14H10V8Z"
        fill="white"
      />
      <path
        d="M20 6V4H18V2C18 0.9 17.1 0 16 0H2C0.9 0 0 0.9 0 2V16C0 17.1 0.9 18 2 18H16C17.1 18 18 17.1 18 16V14H20V12H18V10H20V8H18V6H20ZM16 16H2V2H16V16ZM4 10H9V14H4V10ZM10 4H14V7H10V4ZM4 4H9V9H4V4ZM10 8H14V14H10V8Z"
        fill="url(#paint0_radial_1956_55)"
        fillOpacity="0.6"
      />
      <defs>
        <radialGradient
          id="paint0_radial_1956_55"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(13.9053 7.77098) rotate(174.949) scale(13.9595 58.1014)"
        >
          <stop offset="0.260417" stopColor="#6EE4DA" stopOpacity="0.8" />
          <stop offset="1" stopColor="#B1E3FF" />
        </radialGradient>
      </defs>
    </svg>
  );
};
