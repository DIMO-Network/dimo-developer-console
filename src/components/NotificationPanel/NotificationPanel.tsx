import { type ReactNode, type FC } from 'react';

interface IProps {
  children: ReactNode;
}

export const NotificationPanel: FC<IProps> = ({ children }) => {
  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 flex items-end px-4 py-6 sm:items-start sm:p-6 z-20"
    >
      <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
        {children}
      </div>
    </div>
  );
};
