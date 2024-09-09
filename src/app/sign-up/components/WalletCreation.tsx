import { IAuth } from '@/types/auth';
import { FC, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useGlobalAccount, useUser } from '@/hooks';

interface IProps {
  auth?: Partial<IAuth>;
  onNext: (flow: string, auth?: Partial<IAuth>) => void;
}

export const WalletCreation : FC<IProps> = ({ auth, onNext }) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const {user} = useUser();
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorReason, setErrorReason] = useState<string>('');
  const { setAuthBundle, registerNewWallet, validCredentials } = useGlobalAccount();

  const handleWalletCreation = async () => {
    const newWallet = await registerNewWallet();
    if (!newWallet.success) {
      setErrorReason(newWallet.reason ?? 'Unknown error');
      return;
    }
    setIsSuccess(true);

    onNext('wallet-creation', {
      address: newWallet.address,
    });
  };

  useEffect(() => {
    const token = searchParams.get('bundle');
    if (!token) return;
    setAuthBundle(token);
  }, [searchParams]);

  useEffect(() => {
    console.info('Valid credentials', validCredentials);
    if (!validCredentials) return;
    if(!user?.address){
      handleWalletCreation().catch(console.error);
    } else{
      router.push('/valid-tzd');
    }
  }, [validCredentials]);

  useEffect(() => {
    if(!auth) return;
    if(!user?.address){
      handleWalletCreation().catch(console.error);
    } else{
      router.push('/valid-tzd');
    }
  }, [auth]);

  return (
    <div className={'text-center text-xl'}>
      {
        !user?.address && (
          <h1>Hang tight! we're creating your wallet...</h1>
        )
      }
    </div>
  );
};

export default WalletCreation;