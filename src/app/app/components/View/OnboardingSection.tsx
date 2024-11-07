import { FC } from 'react';
import { Card } from '@/components/Card';
import { Title } from '@/components/Title';
import './View.css';

const OnboardingSection: FC = () => {
  return (
    <Card className="onboarding-card">
      <div className="onboarding-header flex justify-between items-center">
        <Title component="h3" className="onboarding-title">
          What are DIMO Credits (DCX)?
        </Title>
      </div>
      <p className="onboarding-content">
        DCX is a stablecoin that’s pegged to one-tenth of a cent (0.001 USD),
        and is essential for all developers building on DIMO. For DIMO protocol
        fees, spending DCX or $DIMO is required. The only way to get DCX is by
        trading in $DIMO, which converts at the market price. This provides
        developers a way to lock in DCX at rates without being influenced by
        price fluctuation. DCX cannot be converted back into $DIMO and when it
        is spent, it is burned forever. For more details on DCX, check out our
        explanation on DCX & $DIMO.
      </p>
    </Card>
  );
};

export default OnboardingSection;
