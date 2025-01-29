import { useContext, useEffect, useRef, useState } from 'react';

import useStripeCrypto from '@/hooks/useStripeCrypto';
import { StripeCryptoContext } from '@/context/StripeCryptoContext';
import { OnrampSession } from '@stripe/crypto';
import { BubbleLoader } from '@/components/BubbleLoader';
import { IDcxPurchaseTransaction, IStripeCryptoEvent } from '@/types/wallet';
import configuration from '@/config';
import * as Sentry from '@sentry/nextjs';

interface IProps {
  onNext: (flow: string, transaction?: Partial<IDcxPurchaseTransaction>) => void;
  transactionData?: Partial<IDcxPurchaseTransaction>;
}

export const CryptoPurchase = ({ onNext, transactionData }: IProps) => {
  const { stripeClientId } = useContext(StripeCryptoContext);
  const [cryptoSession, setCryptoSession] = useState<OnrampSession>();
  const [sessionReady, setSessionReady] = useState<boolean>(false);
  const { loadStripeOnRamp } = useStripeCrypto();

  const elementRef = useRef<HTMLDivElement>(null);

  const mountOnramp = async () => {
    const container = elementRef.current;
    if (!container) return;
    container.innerHTML = '';
    const stripeOnRamp = await loadStripeOnRamp();
    if (!stripeOnRamp) return;
    return stripeOnRamp
      .createSession({
        clientSecret: stripeClientId!,
        appearance: { theme: 'dark' },
      })
      .mount(container);
  };

  const handleOnReady = () => {
    setSessionReady(true);
  };

  const handleOnChange = (event: IStripeCryptoEvent) => {
    if (event.payload.session.status !== 'fulfillment_complete') return;
    let processedAmount = '1';
    if (configuration.environment === 'production') {
      processedAmount = event.payload.session.quote!.destination_amount!;
    }

    onNext('crypto-purchase', {
      ...transactionData,
      maticAmount: BigInt(Math.floor(Number(processedAmount))),
    });
  };

  useEffect(() => {
    if (stripeClientId) {
      mountOnramp()
        .then((session) => {
          if (!session) return;
          setCryptoSession(session);
        })
        .catch((error) => {
          Sentry.captureException(error);
          console.error('Something went wrong while loading the onramp', error);
        });
    }
  }, [stripeClientId]);

  useEffect(() => {
    if (cryptoSession) {
      cryptoSession.addEventListener('onramp_ui_loaded', handleOnReady);
      cryptoSession.addEventListener('onramp_session_updated', handleOnChange);
      return () => {
        cryptoSession.removeEventListener('onramp_ui_loaded', handleOnReady);
        cryptoSession.removeEventListener('onramp_session_updated', handleOnChange);
      };
    }
    return () => {};
  }, [cryptoSession]);

  return (
    <>
      {!sessionReady && (
        <div>
          <BubbleLoader isLoading={!sessionReady} />
        </div>
      )}
      <div ref={elementRef} className="h-full mr-auto ml-auto" />
    </>
  );
};

export default CryptoPurchase;
