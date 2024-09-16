import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

const web3 = new Web3('https://polygon-mumbai.infura.io/v3/YOUR_INFURA_PROJECT_ID'); // Replace with Infura ID

const contractABI: AbiItem[] = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "amountDimoTokens", "type": "uint256" }
    ],
    "name": "mintInDimo",
    "outputs": [{ "internalType": "uint256", "name": "dimoCredits", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "from", "type": "address" },
      { "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "burn",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
  // Include other ABI methods if needed
];

const contractAddress = '0x523d4a08cf149f1Ada8113B3b3400234236Bb5E8';

const contract = new web3.eth.Contract(contractABI, contractAddress);

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
    console.error('Error minting DIMO Credits:', error);
  }
}
