require('dotenv').config();
const { adoptionService } = require('../services/adoptionService');

async function testFullFlow() {
  console.log('🧪 TESTING COMPLETE ADOPTION FLOW WITH BLOCKCHAIN\n');
  
  // Simulate adoption data (you would use real data from your database)
  const testAdoption = {
    request: { _id: '67a1b2c3d4e5f67890123456' },
    pet: { 
      _id: '67a1b2c3d4e5f67890123457',
      name: 'Blockchain Buddy',
      breed: 'Blockchain Terrier',
      _id: 'pet123'
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

  console.log('🚀 Testing blockchain recording...');
  const result = await adoptionService.finalizeAdoptionAfterPayment('test_request_id');
  
  console.log('📊 Result:', {
    success: result.success,
    pet: result.request.pet.name,
    blockchain: result.blockchain
  });
}

testFullFlow();