import { SuccessIcon } from '@/components/Icons';
import { Button } from '@/components/Button';
import { IDcxPurchaseTransaction } from '@/types/wallet';
import { Title } from '@/components/Title';
import { Card } from '@/components/Card';

interface IProps {
  onNext: (
    flow: string,
    transaction?: Partial<IDcxPurchaseTransaction>,
  ) => void;
  transactionData?: Partial<IDcxPurchaseTransaction>;
}

export const ProcessComplete = ({ onNext }: IProps) => {
  const handleFinish = () => {
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
