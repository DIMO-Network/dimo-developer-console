import { type FC } from 'react';

import './TextError.css';

interface IProps {
  errorMessage: string;
}

export const TextError: FC<IProps> = ({ errorMessage }) => {
  return <span className="error-message">{errorMessage}</span>;
};
