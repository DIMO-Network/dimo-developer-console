import { type FC } from 'react';

import './TextError.css';
import classNames from 'classnames';

interface IProps {
  errorMessage: string;
  className?: string;
}

export const TextError: FC<IProps> = ({ errorMessage, className }) => {
  return <span className={classNames('error-message', className)}>{errorMessage}</span>;
};
