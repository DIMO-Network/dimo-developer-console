import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import contractABI from '../contracts/DimoCreditABI.json';
import { DC_ADDRESS } from '@/config/default';

const web3 = new Web3(
  'https://polygon-mumbai.infura.io/v3/YOUR_INFURA_PROJECT_ID',
); // TODO: Replace with Infura ID and send to .env

// Load contract ABI
const contract = new web3.eth.Contract(
  contractABI as AbiItem[],
  DC_ADDRESS,
);

export async function mintDimoCredits(txHash: string) {
  try {
    const receipt = await web3.eth.getTransactionReceipt(txHash);

    if (receipt && receipt.status) {
      const fromAddress = receipt.from;
      const amountToMint = web3.utils.toWei('10', 'ether'); // Example of 10 DIMO tokens to convert into DIMO Credits

      const gasEstimate = await contract.methods
        .mintInDimo(fromAddress, amountToMint)
        .estimateGas({ from: fromAddress });

      await contract.methods.mintInDimo(fromAddress, amountToMint).send({
        from: fromAddress,
        gas: gasEstimate.toString(), // TODO: gas is a string, need to check this
      });
    } else {
      throw new Error('Transaction failed or not confirmed.');
    }
  } catch (error) {
    console.error(`Error minting DIMO Credits for txHash ${txHash}:`, error);
  }
}
