import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const SuccessIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      width="36"
      height="36"
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13.3259 23.6508L7.24466 17.5696L5.17383 19.6258L13.3259 27.7779L30.8259 10.2779L28.7697 8.22168L13.3259 23.6508Z"
        fill="#36DF71" />
    </svg>
  );
};

export default SuccessIcon;
