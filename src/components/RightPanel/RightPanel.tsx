import { type FC, type PropsWithChildren } from 'react';

import './RightPanel.css';

export const RightPanel: FC<PropsWithChildren> = ({ children }) => {
  return <div className={'right-panel-container'}>{children}</div>;
};
