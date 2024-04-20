import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const MonitorHeartIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="monitor-heart-icon"
    >
      <path
        d="M12.5915 10.375L11.6665 8.53337L9.07484 13.7084C8.9415 13.9917 8.64984 14.1667 8.33317 14.1667C8.0165 14.1667 7.72484 13.9917 7.5915 13.7084L6.14984 10.8334H1.6665V15C1.6665 15.9167 2.4165 16.6667 3.33317 16.6667H16.6665C17.5832 16.6667 18.3332 15.9167 18.3332 15V10.8334H13.3332C13.0165 10.8334 12.7248 10.6584 12.5915 10.375Z"
        fill="#BBBDBC"
      />
      <path
        d="M16.6665 3.33337H3.33317C2.4165 3.33337 1.6665 4.08337 1.6665 5.00004V9.16671H6.6665C6.98317 9.16671 7.27484 9.34171 7.40817 9.62504L8.33317 11.4667L10.9248 6.29171C11.2082 5.72504 12.1332 5.72504 12.4165 6.29171L13.8498 9.16671H18.3332V5.00004C18.3332 4.08337 17.5832 3.33337 16.6665 3.33337Z"
        fill="#BBBDBC"
      />
    </svg>
  );
};

export default MonitorHeartIcon;
