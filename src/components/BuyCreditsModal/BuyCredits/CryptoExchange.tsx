"use client";
import { darkTheme, lightTheme, SupportedChainId, SwapWidget } from '@uniswap/widgets';
import '@uniswap/widgets/fonts.css';
import { IDcxPurchaseTransaction } from '@/types/wallet';
import { useTurnkey } from '@turnkey/sdk-react';
import { useGlobalAccount } from '@/hooks';
import { useEffect, useState } from 'react';
import { Provider } from '@web3-react/types';
import { BubbleLoader } from '@/components/BubbleLoader';

interface IProps {
  onNext: (flow: string, transaction?: Partial<IDcxPurchaseTransaction>) => void;
  transactionData?: Partial<IDcxPurchaseTransaction>;
}
const TOKEN_LIST = 'https://gateway.ipfs.io/ipns/tokens.uniswap.org';

interface WalletConnectConext {

}


export const CryptoExchange = ({ onNext, transactionData }: IProps) => {
  const { connectWallet, organizationInfo } = useGlobalAccount();
  const [provider, setProvider] = useState<Provider>();

  useEffect(() => {
    if (!organizationInfo?.subOrganizationId) return;
    connectWallet().then(() => {
      console.info('Wallet connected');
    }).catch(console.error);
  }, [organizationInfo]);

  return (
    <>
      <BubbleLoader isLoading={true} />
    </>
  );
};

export default CryptoExchange;