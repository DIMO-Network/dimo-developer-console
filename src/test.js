import { utils } from 'web3';

console.log(
  utils.hexToNumber('0x000000000000000000000000000000000000000000000000000000000000002b'),
);
console.log(
  utils.numberToHex(
    utils.hexToNumber(
      '0x000000000000000000000000795f349dd67bd352894426c5034b66162748cc8e',
    ),
  ),
);
