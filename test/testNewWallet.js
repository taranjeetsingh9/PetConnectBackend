require('dotenv').config();
const { Web3 } = require('web3');

async function testNewWallet() {
  console.log('🧪 Testing New Wallet Configuration...\n');
  
  const web3 = new Web3(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
  
  try {
    // Test the new wallet
    const wallet = web3.eth.accounts.privateKeyToAccount(process.env.WALLET_PRIVATE_KEY);
    const balance = await web3.eth.getBalance(wallet.address);
    const balanceEth = web3.utils.fromWei(balance, 'ether');
    
    console.log('🆕 NEW WALLET STATUS:');
    console.log('   Address:', wallet.address);
    console.log('   Balance:', balanceEth, 'ETH');
    console.log('   Status:', parseFloat(balanceEth) > 0 ? '✅ READY FOR REAL BLOCKCHAIN' : '⏳ NEEDS TEST ETH');
    
    if (parseFloat(balanceEth) === 0) {
      console.log('\n🚀 GET TEST ETH FROM:');
      console.log('   https://faucet.metana.io/');
      console.log('   Paste this address:', wallet.address);
    } else {
      console.log('\n🎉 SUCCESS! You have ETH!');
      console.log('   Real blockchain transactions are now enabled!');
    }
    
  } catch (error) {
    console.log('❌ Wallet test failed:', error.message);
  }
}

testNewWallet();