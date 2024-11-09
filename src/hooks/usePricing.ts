'use client';
import { getCachedDimoPrice } from '@/services/wallet';

const usePricing = () => {
  const getDimoPrice = getCachedDimoPrice;

  return {
    getDimoPrice,
  };
};

export default usePricing;
