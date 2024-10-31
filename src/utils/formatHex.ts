import { utils } from 'web3';

export const formatHex = (str: `0x${string}`) => utils.numberToHex(utils.hexToNumber(str));

export const formatHexToNumber = (str: `0x${string}`) => utils.hexToNumber(str);
