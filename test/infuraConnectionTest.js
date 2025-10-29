require('dotenv').config();
const { Web3 } = require('web3');

async function testInfuraConnection() {
  console.log('🔗 Testing Infura Connection...\n');
  
  if (!process.env.INFURA_PROJECT_ID) {
    console.log('❌ INFURA_PROJECT_ID not found in .env');
    console.log('💡 Make sure you added: INFURA_PROJECT_ID=your_key_here');
    return;
  }
  
  console.log('✅ INFURA_PROJECT_ID found');
  console.log('Key:', process.env.INFURA_PROJECT_ID.substring(0, 8) + '...');
  
  try {
    // Test basic connection without wallet
    const web3 = new Web3(`https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);
    
    const blockNumber = await web3.eth.getBlockNumber();
    console.log('✅ Infura RPC connection successful!');
    console.log('📦 Latest block number:', blockNumber);
    
    // Test network ID
    const networkId = await web3.eth.net.getId();
    console.log('🌐 Network ID:', networkId);
    console.log('   (1=Mainnet, 11155111=Sepolia)');
    
  } catch (error) {
    console.log('❌ Infura connection failed:');
    console.log('   Error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   • Check INFURA_PROJECT_ID is correct');
    console.log('   • Ensure network "sepolia" is accessible');
    console.log('   • Verify internet connection');
  }
}

testInfuraConnection();