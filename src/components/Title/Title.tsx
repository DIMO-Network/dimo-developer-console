import { type FC, type ReactNode } from 'react';

import './Title.css';

interface IProps {
  children: ReactNode;
}

export const Title: FC<IProps> = ({ children }) => {
  return <h1 className="title">{children}</h1>;
};

export default Title;
