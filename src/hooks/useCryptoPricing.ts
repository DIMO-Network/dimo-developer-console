'use client';
import {
  getCurrentDimoPrice,
  getCurrentPolPrice,
  getCurrentWMaticPrice,
} from '@/services/wallet';

const useCryptoPricing = () => {
  const getDimoPrice = getCurrentDimoPrice;
  const getPolPrice = getCurrentPolPrice;
  const getWMaticPrice = getCurrentWMaticPrice;

  return {
    getDimoPrice,
    getPolPrice,
    getWMaticPrice,
  };
};

export default useCryptoPricing;
