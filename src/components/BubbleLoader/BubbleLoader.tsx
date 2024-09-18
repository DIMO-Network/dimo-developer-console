import { type FC } from 'react';
import './BubbleLoader.css';

interface IProps {
  isLoading: boolean;
}

export const BubbleLoader: FC<IProps> = ({ isLoading }) => {
  return (
    <>
      {isLoading && (
        <div className="bubble-loader">
          <div className="bubble bubble-1"></div>
          <div className="bubble bubble-2"></div>
          <div className="bubble bubble-3"></div>
        </div>
      )}
    </>
  );
}