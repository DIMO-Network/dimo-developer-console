import { type FC } from 'react';

interface IProps {
  isLoading: boolean;
}

export const AppLoader: FC<IProps> = ({ isLoading }) => {
  return (
    <>
      {isLoading && (
        <div className="loader p-4 max-w-md w-full">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-3 py-1">
              <div className="h-8 bg-primary-200/20 rounded"></div>
              <div className="space-y-3">
                <div className="h-2 bg-primary-200/20 rounded w-16"></div>
              </div>
            </div>
            <div className="rounded-full bg-primary-200 h-10 w-10"></div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppLoader;
