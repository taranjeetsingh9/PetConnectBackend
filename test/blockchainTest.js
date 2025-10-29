require('dotenv').config();
const blockchainService = require('../services/blockchainService');

async function testBlockchain() {
  console.log('🧪 Testing Blockchain Connection...\n');
  
  // Wait for initialization
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('Blockchain Status:', blockchainService.isConnected ? '✅ CONNECTED' : '⚠️ SIMULATION MODE');
  
  if (blockchainService.isConnected) {
    try {
      const accounts = await blockchainService.web3.eth.getAccounts();
      const balance = await blockchainService.web3.eth.getBalance(accounts[0]);
      console.log('💰 Account Balance:', blockchainService.web3.utils.fromWei(balance, 'ether'), 'ETH');
    } catch (error) {
      console.log('❌ Error fetching balance:', error.message);
    }
  }
  
  // Test adoption recording
  const testData = {
    request: { _id: 'test_request_123' },
    pet: { 
      _id: 'test_pet_456', 
      name: 'Test Buddy', 
      breed: 'Labrador'
    },
    adopter: { 
      _id: 'test_adopter_789', 
      name: 'John Doe' 
    },
    organization: { 
      _id: 'test_org_101', 
      name: 'Happy Shelter' 
    }
  };
  
  console.log('\n📝 Testing adoption recording...');
  const result = await blockchainService.recordAdoptionOnChain(testData);
  
  console.log('📊 Result:', {
    success: result.success,
    transactionHash: result.transactionHash,
    blockchainId: result.blockchainId,
    simulated: result.simulated
  });
  
  if (result.success) {
    console.log('✅ Blockchain service working!');
  } else {
    console.log('❌ Blockchain service needs configuration');
  }
}

testBlockchain();

// 0xf76aa547c372adc99ed81b91e1a7cd171a4e4c8620684ee06adecfda99217091

// ✅ WALLET CREATED SUCCESSFULLY!
// ================================
// Address: 0x4472F44bFE35A66107d9c6e135F9F14dBe19620B
// Private Key: 0xf76aa547c372adc99ed81b91e1a7cd171a4e4c8620684ee06adecfda99217091
// ================================

// 📝 ADD THIS TO YOUR .env FILE:
// WALLET_PRIVATE_KEY=0xf76aa547c372adc99ed81b91e1a7cd171a4e4c8620684ee06adecfda99217091