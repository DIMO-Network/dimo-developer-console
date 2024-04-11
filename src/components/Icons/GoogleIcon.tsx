import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const GoogleIcon: FC<IconProps> = ({ className = '' }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 25 25"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="google-icon"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.332 12.4909C21.332 11.8386 21.2735 11.2113 21.1647 10.6091H12.5V14.1679H17.4513C17.238 15.3179 16.5898 16.2922 15.6155 16.9446V19.2529H18.5887C20.3284 17.6513 21.332 15.2928 21.332 12.4909Z"
        fill="#4285F4"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.5 21.482C14.984 21.482 17.0665 20.6582 18.5887 19.2531L15.6155 16.9448C14.7916 17.4968 13.7378 17.8229 12.5 17.8229C10.1038 17.8229 8.07564 16.2046 7.35219 14.03H4.27855V16.4137C5.79237 19.4204 8.90364 21.482 12.5 21.482Z"
        fill="#34A853"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.35219 14.03C7.16818 13.478 7.06364 12.8884 7.06364 12.282C7.06364 11.6757 7.16818 11.086 7.35219 10.534V8.15039H4.27855C3.65546 9.39239 3.3 10.7975 3.3 12.282C3.3 13.7666 3.65546 15.1717 4.27855 16.4137L7.35219 14.03Z"
        fill="#FBBC05"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.5 6.74112C13.8507 6.74112 15.0635 7.2053 16.0169 8.11694L18.6556 5.47821C17.0624 3.99367 14.9798 3.08203 12.5 3.08203C8.90364 3.08203 5.79237 5.14367 4.27855 8.15039L7.35219 10.534C8.07564 8.35949 10.1038 6.74112 12.5 6.74112Z"
        fill="#EA4335"
      />
    </svg>
  );
};

export default GoogleIcon;
