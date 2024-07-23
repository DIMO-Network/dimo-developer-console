import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const LightBulb: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z"
        fill="white"
      />
      <path
        d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.9 22 12 22Z"
        fill="url(#paint0_radial_1329_3349)"
        fillOpacity="0.6"
      />
      <path
        d="M9 19H15C15.55 19 16 18.55 16 18C16 17.45 15.55 17 15 17H9C8.45 17 8 17.45 8 18C8 18.55 8.45 19 9 19Z"
        fill="white"
      />
      <path
        d="M9 19H15C15.55 19 16 18.55 16 18C16 17.45 15.55 17 15 17H9C8.45 17 8 17.45 8 18C8 18.55 8.45 19 9 19Z"
        fill="url(#paint1_radial_1329_3349)"
        fillOpacity="0.6"
      />
      <path
        d="M12 2C7.86 2 4.5 5.36 4.5 9.5C4.5 13.32 7.16 15.36 8.27 16H15.73C16.84 15.36 19.5 13.32 19.5 9.5C19.5 5.36 16.14 2 12 2Z"
        fill="white"
      />
      <path
        d="M12 2C7.86 2 4.5 5.36 4.5 9.5C4.5 13.32 7.16 15.36 8.27 16H15.73C16.84 15.36 19.5 13.32 19.5 9.5C19.5 5.36 16.14 2 12 2Z"
        fill="url(#paint2_radial_1329_3349)"
        fillOpacity="0.6"
      />
      <defs>
        <radialGradient
          id="paint0_radial_1329_3349"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(14.929 10.6344) rotate(172.54) scale(10.518 64.2602)"
        >
          <stop offset="0.260417" stopColor="#6EE4DA" stopOpacity="0.8" />
          <stop offset="1" stopColor="#B1E3FF" />
        </radialGradient>
        <radialGradient
          id="paint1_radial_1329_3349"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(14.929 10.6344) rotate(172.54) scale(10.518 64.2602)"
        >
          <stop offset="0.260417" stopColor="#6EE4DA" stopOpacity="0.8" />
          <stop offset="1" stopColor="#B1E3FF" />
        </radialGradient>
        <radialGradient
          id="paint2_radial_1329_3349"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(14.929 10.6344) rotate(172.54) scale(10.518 64.2602)"
        >
          <stop offset="0.260417" stopColor="#6EE4DA" stopOpacity="0.8" />
          <stop offset="1" stopColor="#B1E3FF" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default LightBulb;
