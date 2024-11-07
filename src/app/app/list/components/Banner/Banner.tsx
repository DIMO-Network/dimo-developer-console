import { FC } from 'react';

import { Button } from '@/components/Button';

import './Banner.css';

export interface CTA {
  label: string;
  onClick: () => void;
}

interface IProps {
  cta?: CTA;
}

export const Banner: FC<IProps> = ({ cta }) => {
  return (
    <div className="banner-content">
      <div className="image-content">
        <img alt="Onboarding banner" src="/images/dimo_banner.png" />
      </div>
      {cta && (
        <div>
          <Button
            className="cta primary-solid rounded-sm"
            onClick={cta.onClick}
            type="button"
          >
            {cta.label}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Banner;
