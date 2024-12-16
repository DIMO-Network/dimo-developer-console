import { useState } from 'react';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { IDcxPurchaseTransaction } from '@/types/wallet';
import { sendTokenBoughtEmail } from '@/actions/token';
import { SuccessIcon } from '@/components/Icons';
import { Title } from '@/components/Title';

interface IProps {
  onNext: (
    flow: string,
    transaction?: Partial<IDcxPurchaseTransaction>,
  ) => void;
  transactionData?: Partial<IDcxPurchaseTransaction>;
}

export const ProcessComplete = ({ onNext, transactionData }: IProps) => {
  const [loading, setLoading] = useState(false);

  const handleFinish = () => {
    if (loading) return;

    setLoading(true);
    sendTokenBoughtEmail('DCX', transactionData!.dcxAmount!).then(() => {
      setLoading(false);
    });
    onNext('dcx-minted');
  };

  return (
    <Card className="success-card">
      <SuccessIcon className="w-10 h-10" />
      <Title component="h1">Successfully Purchased DCX</Title>
      <Button className="primary w-40 !h-9" onClick={handleFinish}>
        Finish
      </Button>
    </Card>
  );
};

export default ProcessComplete;
