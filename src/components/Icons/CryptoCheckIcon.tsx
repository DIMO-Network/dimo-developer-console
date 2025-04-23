import type { FC } from 'react';

import React from 'react';

import { IconProps } from './index';

export const CryptoCheckIcon: FC<IconProps> = ({ className }) => {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M9 10.5004L12 13.5004L20 5.50044M20 11.5004C19.9995 13.2001 19.4577 14.8553 18.4532 16.2263C17.4486 17.5973 16.0336 18.6128 14.4131 19.1254C12.7926 19.6381 11.051 19.6214 9.44072 19.0776C7.83042 18.5339 6.43514 17.4915 5.45714 16.1014C4.47915 14.7114 3.96927 13.046 4.00143 11.3467C4.0336 9.64734 4.60613 8.00243 5.63602 6.65039C6.66592 5.29835 8.09966 4.30944 9.72938 3.82705C11.3591 3.34465 13.1001 3.39382 14.7 3.96744"
        stroke="#46F1E4"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
