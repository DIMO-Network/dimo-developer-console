import { useState } from 'react';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IDcxPurchaseTransaction } from '@/types/wallet';
import { sendTokenBoughtEmail } from '@/actions/token';
import { SuccessIcon } from '@/components/Icons';
import { Title } from '@/components/Title';
import { useGlobalAccount } from '@/hooks';

interface IProps {
  onNext: (flow: string, transaction?: Partial<IDcxPurchaseTransaction>) => void;
  transactionData?: Partial<IDcxPurchaseTransaction>;
}

export const ProcessComplete = ({ onNext, transactionData }: IProps) => {
  const [loading, setLoading] = useState(false);
  const { currentUser } = useGlobalAccount();

  const handleFinish = () => {
    if (loading) return;

    setLoading(true);
    const transactionToSend = {
      amount: Number(transactionData!.dcxAmount ?? BigInt(0)),
      wallet: currentUser!.smartContractAddress ?? '',
    };
    sendTokenBoughtEmail('DCX', transactionToSend).then(() => {
      setLoading(false);
    });
    onNext('dcx-minted');
  };

  return (
    <Card className="success-card">
      <SuccessIcon className="w-10 h-10" />
      <Title component="h1" className="text-2xl text-center">
        Successfully Purchased DCX
      </Title>
      <p className="text-center">
        Please check your inbox for the invoice. It should arrive within 24 hours.
      </p>
      <Button className="primary w-40 !h-9" onClick={handleFinish}>
        Finish
      </Button>
    </Card>
  );
};

export default ProcessComplete;
