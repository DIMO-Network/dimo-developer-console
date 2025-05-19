import { type FC } from 'react';
import './BubbleLoader.css';
import classnames from 'classnames';

interface IProps {
  isLoading: boolean;
  isSmall?: boolean;
  className?: string;
}

export const BubbleLoader: FC<IProps> = ({ isLoading, isSmall = false, className }) => {
  return (
    <>
      {isLoading && (
        <div className={classnames('bubble-loader', className)}>
          <div className={classnames('bubble bubble-1', isSmall && `!w-2 !h-2`)}></div>
          <div className={classnames('bubble bubble-2', isSmall && `!w-2 !h-2`)}></div>
          <div className={classnames('bubble bubble-3', isSmall && `!w-2 !h-2`)}></div>
        </div>
      )}
    </>
  );
};
