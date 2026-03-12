'use client';
import {
  getCachedDimoPrice,
  getCachedPolPrice,
  getCachedWmaticPrice,
} from '@/services/pricing';

const useCryptoPricing = () => {
  const getDimoPrice = getCachedDimoPrice;
  const getPolPrice = getCachedPolPrice;
  const getWMaticPrice = getCachedWmaticPrice;

  return {
    getDimoPrice,
    getPolPrice,
    getWMaticPrice,
  };
};

export default useCryptoPricing;
