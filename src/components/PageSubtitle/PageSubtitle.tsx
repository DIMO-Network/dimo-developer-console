import React, { type FC } from 'react';

import { Title } from '../Title';

import './PageSubtitle.css';

export const PageSubtitle: FC<{ subtitle: string }> = ({ subtitle }) => {
  return (
    <div className="subtitle-content">
      <Title component="h2" className="subtitle">
        {subtitle}
      </Title>
    </div>
  );
};

export default PageSubtitle;
