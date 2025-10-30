require('dotenv').config();
const blockchainService = require('../services/blockchainService');

async function testBlockchainIntegration() {
  console.log('🧪 TESTING BLOCKCHAIN INTEGRATION (No DB Required)\n');
  
  // Wait for blockchain service to initialize
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('🔗 Blockchain Status:');
  console.log('   Connected:', blockchainService.isConnected ? '✅' : '❌');
  console.log('   Has Gas:', blockchainService.hasGas ? '✅' : '❌');
  console.log('   Contract:', blockchainService.contract ? '✅ LOADED' : '❌ MISSING');
  
  if (!blockchainService.isConnected) {
    console.log('❌ Blockchain not connected - check configuration');
    return;
  }

  // Test adoption recording with mock data (no DB calls)
  console.log('\n🚀 Testing Blockchain Adoption Recording...');
  
  const mockAdoptionData = {
    request: { _id: '67a1b2c3d4e5f67890123456' },
    pet: { 
      _id: '67a1b2c3d4e5f67890123457',
      name: 'Blockchain Buddy',
      breed: 'Blockchain Terrier'
    },
    adopter: { 
      _id: '67a1b2c3d4e5f67890123458',
      name: 'Crypto User'
    },
    organization: { 
      _id: '67a1b2c3d4e5f67890123459',
      name: 'Blockchain Shelter'
    }
  };

  try {
    const result = await blockchainService.recordAdoptionOnChain(mockAdoptionData);
    
    console.log('\n🎯 BLOCKCHAIN ADOPTION RESULT:');
    console.log('══════════════════════════════════════');
    console.log('✅ Success:', result.success);
    console.log('🐾 Pet:', mockAdoptionData.pet.name);
    console.log('🔗 Transaction:', result.transactionHash);
    console.log('📝 Blockchain ID:', result.blockchainId);
    console.log('🌐 Simulated:', result.simulated);
    console.log('💬 Message:', result.message);
    console.log('══════════════════════════════════════\n');

    if (!result.simulated) {
      console.log('🎉 REAL BLOCKCHAIN TRANSACTION READY!');
      console.log('📍 Contract:', process.env.CONTRACT_ADDRESS);
      console.log('\n🚀 Your blockchain integration is WORKING!');
      console.log('   When real adoptions finalize, they will be recorded on-chain.');
    } else {
      console.log('💡 Ready for real blockchain transactions!');
      console.log('   Add CONTRACT_ADDRESS to .env for real transactions.');
    }

  } catch (error) {
    console.log('❌ Blockchain test failed:', error.message);
  }
}

testBlockchainIntegration();