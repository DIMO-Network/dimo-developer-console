import { FC, PropsWithChildren } from 'react';

export const Section: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="flex flex-col justify-between gap-4 rounded-card bg-card p-4">
      {children}
    </div>
  );
};
