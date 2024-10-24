import { SuccessIcon } from '@/components/Icons';
import { Button } from '@/components/Button';
import { IDcxPurchaseTransaction } from '@/types/wallet';

interface IProps {
  onNext: (flow: string, transaction?: Partial<IDcxPurchaseTransaction>) => void;
  transactionData?: Partial<IDcxPurchaseTransaction>;
}

export const ProcessComplete = ({ onNext }: IProps) => {
  const handleFinish = () => {
    onNext('dcx-minted');
  };

  return (
    <div className="success-card">
      <SuccessIcon className="w-10 h-10" />
      <h1>Successfully Minted DCX</h1>
      <Button className="primary w-40 !h-9" onClick={handleFinish} >
        Finish
      </Button>
    </div>
  );
};

export default ProcessComplete;