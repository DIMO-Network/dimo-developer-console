import { useState } from 'react';

interface IParams {
  [key: string]: unknown;
}

export const useLoading = (
  action: (args?: IParams | IParams[]) => Promise<void>,
) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (...args: IParams[]): Promise<void> => {
    setLoading(true);
    try {
      if (loading) return;
      const actionParams = { ...args };
      await action(actionParams);
    } finally {
      setLoading(false);
    }
  };

  return [handleAction, loading];
};

export default useLoading;
