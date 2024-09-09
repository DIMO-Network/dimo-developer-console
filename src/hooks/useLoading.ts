import { useState } from 'react';

export const useLoading = (action) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (...args: any[]) => {
    setLoading(true);
    try {
      if (loading) return;
      await action(...args);
    }finally {
      setLoading(false);
    }
  };

  return [handleAction, loading];
};

export default useLoading;