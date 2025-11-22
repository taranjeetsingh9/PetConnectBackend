const {Web3} = require('web3');

function createTestWallet() {
  console.log(' Creating Test Wallet for Blockchain...\n');
  
  // Generate a new wallet
  const web3 = new Web3();
  const account = web3.eth.accounts.create();

  
  return account;
}

// Run if called directly
if (require.main === module) {
  createTestWallet();
}

module.exports = createTestWallet;
