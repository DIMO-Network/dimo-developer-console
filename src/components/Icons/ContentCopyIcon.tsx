import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const ContentCopyIcon: FC<IconProps> = ({ className, onClick }) => {
  return (
    <svg
      className={className}
      onClick={onClick}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="content-copy-icon"
    >
      <path d="M13.7497 0.833374H3.74967C2.83301 0.833374 2.08301 1.58337 2.08301 2.50004V14.1667H3.74967V2.50004H13.7497V0.833374ZM16.2497 4.16671H7.08301C6.16634 4.16671 5.41634 4.91671 5.41634 5.83337V17.5C5.41634 18.4167 6.16634 19.1667 7.08301 19.1667H16.2497C17.1663 19.1667 17.9163 18.4167 17.9163 17.5V5.83337C17.9163 4.91671 17.1663 4.16671 16.2497 4.16671ZM16.2497 17.5H7.08301V5.83337H16.2497V17.5Z" />
    </svg>
  );
};

export default ContentCopyIcon;