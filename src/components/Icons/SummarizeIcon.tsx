import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const SummarizeIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="summarize-icon"
    >
      <path
        d="M12.9917 2.99167C12.675 2.675 12.25 2.5 11.8083 2.5H4.16667C3.25 2.5 2.50833 3.25 2.50833 4.16667L2.5 15.8333C2.5 16.75 3.24167 17.5 4.15833 17.5H15.8333C16.75 17.5 17.5 16.75 17.5 15.8333V8.19167C17.5 7.75 17.325 7.325 17.0083 7.01667L12.9917 2.99167ZM6.66667 14.1667C6.20833 14.1667 5.83333 13.7917 5.83333 13.3333C5.83333 12.875 6.20833 12.5 6.66667 12.5C7.125 12.5 7.5 12.875 7.5 13.3333C7.5 13.7917 7.125 14.1667 6.66667 14.1667ZM6.66667 10.8333C6.20833 10.8333 5.83333 10.4583 5.83333 10C5.83333 9.54167 6.20833 9.16667 6.66667 9.16667C7.125 9.16667 7.5 9.54167 7.5 10C7.5 10.4583 7.125 10.8333 6.66667 10.8333ZM6.66667 7.5C6.20833 7.5 5.83333 7.125 5.83333 6.66667C5.83333 6.20833 6.20833 5.83333 6.66667 5.83333C7.125 5.83333 7.5 6.20833 7.5 6.66667C7.5 7.125 7.125 7.5 6.66667 7.5ZM11.6667 7.5V3.75L16.25 8.33333H12.5C12.0417 8.33333 11.6667 7.95833 11.6667 7.5Z"
        fill="#BBBDBC"
      />
    </svg>
  );
};

export default SummarizeIcon;