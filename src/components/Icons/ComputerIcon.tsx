import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const ComputerIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="computer-icon"
    >
      <g clipPath="url(#clip0_1493_10913)">
        <path
          d="M20.5 18.282C21.6 18.282 22.49 17.382 22.49 16.282L22.5 6.28198C22.5 5.18198 21.6 4.28198 20.5 4.28198H4.5C3.4 4.28198 2.5 5.18198 2.5 6.28198V16.282C2.5 17.382 3.4 18.282 4.5 18.282H0.5V20.282H24.5V18.282H20.5ZM4.5 6.28198H20.5V16.282H4.5V6.28198Z"
          fill="white"
        />
        <path
          d="M20.5 18.282C21.6 18.282 22.49 17.382 22.49 16.282L22.5 6.28198C22.5 5.18198 21.6 4.28198 20.5 4.28198H4.5C3.4 4.28198 2.5 5.18198 2.5 6.28198V16.282C2.5 17.382 3.4 18.282 4.5 18.282H0.5V20.282H24.5V18.282H20.5ZM4.5 6.28198H20.5V16.282H4.5V6.28198Z"
          fill="url(#paint0_radial_1493_10913)"
          fillOpacity="0.6"
        />
      </g>
      <defs>
        <radialGradient
          id="paint0_radial_1493_10913"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(17.1864 11.1895) rotate(176.254) scale(16.7221 51.7362)"
        >
          <stop offset="0.260417" stopColor="#6EE4DA" stopOpacity="0.8" />
          <stop offset="1" stopColor="#B1E3FF" />
        </radialGradient>
        <clipPath id="clip0_1493_10913">
          <rect
            width="24"
            height="24"
            fill="white"
            transform="translate(0.5 0.281982)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

export default ComputerIcon;
