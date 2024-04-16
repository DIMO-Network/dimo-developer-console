import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const PhoneIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 15 23"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.5 0.281982H3.5C1.84 0.281982 0.5 1.62198 0.5 3.28198V19.282C0.5 20.942 1.84 22.282 3.5 22.282H11.5C13.16 22.282 14.5 20.942 14.5 19.282V3.28198C14.5 1.62198 13.16 0.281982 11.5 0.281982ZM9 20.282H6C5.72 20.282 5.5 20.062 5.5 19.782C5.5 19.502 5.72 19.282 6 19.282H9C9.28 19.282 9.5 19.502 9.5 19.782C9.5 20.062 9.28 20.282 9 20.282ZM12.5 17.282H2.5V3.28198H12.5V17.282Z"
        fill="white"
      />
      <path
        d="M11.5 0.281982H3.5C1.84 0.281982 0.5 1.62198 0.5 3.28198V19.282C0.5 20.942 1.84 22.282 3.5 22.282H11.5C13.16 22.282 14.5 20.942 14.5 19.282V3.28198C14.5 1.62198 13.16 0.281982 11.5 0.281982ZM9 20.282H6C5.72 20.282 5.5 20.062 5.5 19.782C5.5 19.502 5.72 19.282 6 19.282H9C9.28 19.282 9.5 19.502 9.5 19.782C9.5 20.062 9.28 20.282 9 20.282ZM12.5 17.282H2.5V3.28198H12.5V17.282Z"
        fill="url(#paint0_radial_1649_267)"
        fillOpacity="0.6"
      />
      <defs>
        <radialGradient
          id="paint0_radial_1649_267"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(10.2337 9.77984) rotate(171.227) scale(9.84894 70.4556)"
        >
          <stop offset="0.260417" stopColor="#6EE4DA" stopOpacity="0.8" />
          <stop offset="1" stopColor="#B1E3FF" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default PhoneIcon;
