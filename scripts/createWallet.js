const {Web3} = require('web3');

function createTestWallet() {
  console.log('🔐 Creating Test Wallet for Blockchain...\n');
  
  // Generate a new wallet
  const web3 = new Web3();
  const account = web3.eth.accounts.create();
  
  console.log('✅ WALLET CREATED SUCCESSFULLY!');
  console.log('================================');
  console.log('Address:', account.address);
  console.log('Private Key:', account.privateKey);
  console.log('================================\n');
  
  console.log('📝 ADD THIS TO YOUR .env FILE:');
  console.log('WALLET_PRIVATE_KEY=' + account.privateKey);
  console.log('\n⚠️  IMPORTANT SECURITY NOTES:');
  console.log('   • NEVER commit this private key to GitHub');
  console.log('   • Use this ONLY for testing on Sepolia testnet');
  console.log('   • This wallet has NO real ETH - use faucet to get test ETH');
  console.log('   • For production, use proper wallet management');
  
  return account;
}

// Run if called directly
if (require.main === module) {
  createTestWallet();
}

module.exports = createTestWallet;