import { Anchor } from '@/components/Anchor';
import { Title } from '@/components/Title';

import './Explanation.css';

export const Explanation = () => {
  return (
    <div className="explanation-content">
      <Title component="h4" className="title">
        What are DIMO Credits (DCX)?
      </Title>
      <p className="description-content">
        DCX is a stablecoin that’s pegged to one-tenth of a cent (0.001 USD),
        and is essential for all developers building on DIMO. For DIMO protocol
        fees, spending DCX or $DIMO is required. The only way to get DCX is by
        trading in $DIMO, which converts at the market price. This provides
        developers a way to lock-in DCX at a rate without being influenced by
        price fluctuation. DCX cannot be converted back into $DIMO and when it
        is spent, it is burned forever. For more details on DCX, check out{' '}
        <Anchor
          href={
            'https://github.com/DIMO-Network/DIP/blob/main/draft%20proposals%20for%20community%20review/dimo-nodes-and-token-upgrades.md#dcx--dimo'
          }
          className="underline"
          target="_blank"
        >
          our explanation on DCX & $DIMO.
        </Anchor>
      </p>
    </div>
  );
};

export default Explanation;
