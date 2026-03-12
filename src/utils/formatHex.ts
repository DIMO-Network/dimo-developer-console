import { utils } from 'web3';
import { ethers } from 'ethers';

export const formatHex = (str: `0x${string}`) =>
  utils.numberToHex(utils.hexToNumber(str));

export const formatHexToNumber = (str: `0x${string}`) => utils.hexToNumber(str);

export const decodeHex = (str: `0x${string}`, type: string) => {
  const decoder = ethers.AbiCoder.defaultAbiCoder();
  const response = decoder.decode([type], str);
  return response[0];
};
