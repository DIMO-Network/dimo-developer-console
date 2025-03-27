import {BubbleLoader} from "@/components/BubbleLoader";
import {TokenBalance} from "@/components/TokenBalance";
import config from "@/config";
import {useGlobalAccount, useLoading} from "@/hooks";
import * as Sentry from "@sentry/nextjs";
import useCryptoPricing from "@/hooks/useCryptoPricing";
import {useContext, useEffect, useState} from "react";
import {NotificationContext} from "@/context/notificationContext";
import {AccountInformationContext} from "@/context/AccountInformationContext";
import {CreditsContext} from "@/context/creditsContext";

import '../../shared/AccountInformationModal.css';

interface Balance {
  dcxBalance: number;
  dimoBalance: number;
  dimoPrice: number;
}

interface IProps {
  shouldFetchBalances: boolean;
}

export const Balances = ({ shouldFetchBalances }: IProps) => {
  const [balance, setBalance] = useState<Balance>({ dcxBalance: 0, dimoBalance: 0, dimoPrice: 0 });
  const { getCurrentDcxBalance, getCurrentDimoBalance } = useGlobalAccount();
  const { getDimoPrice } = useCryptoPricing();
  const { setNotification } = useContext(NotificationContext);
  const { setIsOpen } = useContext(CreditsContext);
  const { setShowAccountInformation } = useContext(
    AccountInformationContext,
  );

  const handleOpenBuyCreditsModal = () => {
    setShowAccountInformation(false);
    setTimeout(() => setIsOpen(true), 300);
  };

  const loadBalances = async () => {
    try {
      const [dimoBalance, dcxBalance, dimoPrice] = await Promise.all([
        getCurrentDimoBalance(),
        getCurrentDcxBalance(),
        getDimoPrice(),
      ]);
      setBalance({ dimoBalance, dcxBalance, dimoPrice });
    } catch (error: unknown) {
      Sentry.captureException(error);
      console.error('Error while loading balances', error);
      setNotification('Error while loading balances', 'Error', 'error');
    }
  };

  const { handleAction: getBalances, loading: isLoadingBalances } =
    useLoading(loadBalances);

  useEffect(() => {
    if (!shouldFetchBalances) return;
    void getBalances();
  }, [shouldFetchBalances]);

  return (
    <div className="balances">
      {isLoadingBalances && (
        <>
          <BubbleLoader isLoading={isLoadingBalances}/>
          <p className="loading-text">Loading your balances...</p>
        </>
      )}
      {!isLoadingBalances && (
        <>
          <TokenBalance
            token={'dimo'}
            balance={balance.dimoBalance}
            basePrice={balance.dimoPrice}
            canBuy={false}
          />
          <TokenBalance
            token={'dcx'}
            balance={balance.dcxBalance}
            basePrice={0.001}
            canBuy={balance.dcxBalance < config.MINIMUM_CREDITS}
            openBuyModal={handleOpenBuyCreditsModal}
            iconClassName={'border border-[#E80303]'}
          />
        </>
      )}
    </div>
  );
};
