import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const WarningAmberIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="warning-amber-icon"
    >
      <path
        d="M12.0001 5.49372L19.5301 18.5037H4.47012L12.0001 5.49372ZM2.74012 17.5037C1.97012 18.8337 2.93012 20.5037 4.47012 20.5037H19.5301C21.0701 20.5037 22.0301 18.8337 21.2601 17.5037L13.7301 4.49372C12.9601 3.16372 11.0401 3.16372 10.2701 4.49372L2.74012 17.5037ZM11.0001 10.5037V12.5037C11.0001 13.0537 11.4501 13.5037 12.0001 13.5037C12.5501 13.5037 13.0001 13.0537 13.0001 12.5037V10.5037C13.0001 9.95372 12.5501 9.50372 12.0001 9.50372C11.4501 9.50372 11.0001 9.95372 11.0001 10.5037ZM11.0001 15.5037H13.0001V17.5037H11.0001V15.5037Z"
        fill="white"
      />
      <path
        d="M12.0001 5.49372L19.5301 18.5037H4.47012L12.0001 5.49372ZM2.74012 17.5037C1.97012 18.8337 2.93012 20.5037 4.47012 20.5037H19.5301C21.0701 20.5037 22.0301 18.8337 21.2601 17.5037L13.7301 4.49372C12.9601 3.16372 11.0401 3.16372 10.2701 4.49372L2.74012 17.5037ZM11.0001 10.5037V12.5037C11.0001 13.0537 11.4501 13.5037 12.0001 13.5037C12.5501 13.5037 13.0001 13.0537 13.0001 12.5037V10.5037C13.0001 9.95372 12.5501 9.50372 12.0001 9.50372C11.4501 9.50372 11.0001 9.95372 11.0001 10.5037ZM11.0001 15.5037H13.0001V17.5037H11.0001V15.5037Z"
        fill="url(#paint0_radial_1329_3330)"
        fillOpacity="0.6"
      />
      <defs>
        <radialGradient
          id="paint0_radial_1329_3330"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(15.7224 10.8387) rotate(174.993) scale(13.3044 54.9014)"
        >
          <stop offset="0.260417" stopColor="#6EE4DA" stopOpacity="0.8" />
          <stop offset="1" stopColor="#B1E3FF" />
        </radialGradient>
      </defs>
    </svg>
  );
};

export default WarningAmberIcon;
