import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const SiweIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      width="19"
      height="19"
      viewBox="0 0 19 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="siwe-icon"
    >
      <path
        d="M18 4.56186V2.28186C18 1.18186 17.1 0.28186 16 0.28186H2C0.89 0.28186 0 1.18186 0 2.28186V16.2819C0 17.3819 0.89 18.2819 2 18.2819H16C17.1 18.2819 18 17.3819 18 16.2819V14.0019C18.59 13.6519 19 13.0219 19 12.2819V6.28186C19 5.54186 18.59 4.91186 18 4.56186ZM17 6.28186V12.2819H10V6.28186H17ZM2 16.2819V2.28186H16V4.28186H10C8.9 4.28186 8 5.18186 8 6.28186V12.2819C8 13.3819 8.9 14.2819 10 14.2819H16V16.2819H2Z"
        fill="white"
      />
      <path
        d="M13 10.7819C13.8284 10.7819 14.5 10.1103 14.5 9.28186C14.5 8.45343 13.8284 7.78186 13 7.78186C12.1716 7.78186 11.5 8.45343 11.5 9.28186C11.5 10.1103 12.1716 10.7819 13 10.7819Z"
        fill="white"
      />
    </svg>
  );
};

export default SiweIcon;
