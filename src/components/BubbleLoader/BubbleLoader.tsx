import { type FC } from 'react';
import './BubbleLoader.css';
import classnames from 'classnames';

interface IProps {
  isLoading: boolean;
  size?: number;
}

export const BubbleLoader: FC<IProps> = ({ isLoading, size = 4 }) => {
  return (
    <>
      {isLoading && (
        <div className="bubble-loader">
          <div className={classnames('bubble bubble-1', `!w-${size} !h-${size}`)}></div>
          <div className={classnames('bubble bubble-2', `!w-${size} !h-${size}`)}></div>
          <div className={classnames('bubble bubble-3', `!w-${size} !h-${size}`)}></div>
        </div>
      )}
    </>
  );
};
