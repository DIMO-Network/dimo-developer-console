import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const WalletIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 20 19"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="wallet-icon"
    >
      <path
        d="M18.5 4.94675V2.66675C18.5 1.56675 17.6 0.666748 16.5 0.666748H2.5C1.39 0.666748 0.5 1.56675 0.5 2.66675V16.6667C0.5 17.7667 1.39 18.6667 2.5 18.6667H16.5C17.6 18.6667 18.5 17.7667 18.5 16.6667V14.3867C19.09 14.0367 19.5 13.4067 19.5 12.6667V6.66675C19.5 5.92675 19.09 5.29675 18.5 4.94675ZM17.5 6.66675V12.6667H10.5V6.66675H17.5ZM2.5 16.6667V2.66675H16.5V4.66675H10.5C9.4 4.66675 8.5 5.56675 8.5 6.66675V12.6667C8.5 13.7667 9.4 14.6667 10.5 14.6667H16.5V16.6667H2.5Z"
        fill="white"
      />
      <path
        d="M13.5 11.1667C14.3284 11.1667 15 10.4952 15 9.66675C15 8.83832 14.3284 8.16675 13.5 8.16675C12.6716 8.16675 12 8.83832 12 9.66675C12 10.4952 12.6716 11.1667 13.5 11.1667Z"
        fill="white"
      />
    </svg>
  );
};

export default WalletIcon;
