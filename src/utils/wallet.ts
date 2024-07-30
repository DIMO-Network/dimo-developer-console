import Web3 from 'web3';

export const generateWallet = () => {
  const web3 = new Web3(window.ethereum);
  const account = web3.eth.accounts.create();
  const [wallet] = web3.eth.accounts.wallet.add(account);
  return wallet;
};
