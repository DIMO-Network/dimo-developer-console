import { FC, PropsWithChildren } from 'react';

export const Section: FC<PropsWithChildren> = ({ children }) => {
  return (
    <div className="p-4 bg-surface-raised rounded-2xl flex flex-col gap-4 justify-between">
      {children}
    </div>
  );
};
