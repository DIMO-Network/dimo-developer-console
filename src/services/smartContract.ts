import Web3 from 'web3';
import { AbiItem } from 'web3-utils';
import contractABI from '../config/dimoContract.json';
import { DIMO_CONTRACT_ADDRESS } from '@/config/default';

const web3 = new Web3('https://polygon-mumbai.infura.io/v3/YOUR_INFURA_PROJECT_ID'); // Replace with Infura ID

// Load contract ABI
const contract = new web3.eth.Contract(contractABI as AbiItem[], DIMO_CONTRACT_ADDRESS);

// Function to mint DIMO Credits and burn DIMO tokens
export async function mintDimoCredits(txHash: string) {
  try {
    // Get the transaction receipt
    const receipt = await web3.eth.getTransactionReceipt(txHash);

    // Check if the transaction was successful
    if (receipt && receipt.status) {
      const fromAddress = receipt.from;  // Extract the sender's address from the transaction
      const amountToMint = web3.utils.toWei('10', 'ether');  // Example of 10 DIMO tokens to convert into DIMO Credits

      // Call the mintInDimo method from the smart contract
      const gasEstimate = await contract.methods.mintInDimo(fromAddress, amountToMint).estimateGas({ from: fromAddress });

      await contract.methods.mintInDimo(fromAddress, amountToMint).send({
        from: fromAddress,  // Sender's address
        gas: gasEstimate    // Set gas estimate
      });

      console.log('DIMO tokens successfully converted to DIMO Credits and burned.');
    } else {
      throw new Error('Transaction failed or not confirmed.');
    }
  } catch (error) {
    // Add the txHash to the error log to facilitate debugging
    console.error(`Error minting DIMO Credits for txHash ${txHash}:`, error);
  }
}
