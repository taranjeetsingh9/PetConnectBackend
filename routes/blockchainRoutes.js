const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const blockchainService = require('../services/blockchainService');
const AdoptionRequest = require('../models/AdopterRequest');

// Verify adoption on blockchain
router.get('/adoptions/:requestId/verify', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await AdoptionRequest.findById(requestId)
      .populate('pet adopter organization');
    
    if (!request) {
      return res.status(404).json({ error: 'Adoption request not found' });
    }

    // Check if recorded on blockchain
    const verification = {
      requestId: request._id,
      petId: request.pet._id,
      petName: request.pet.name,
      blockchainRecord: request.blockchain,
      verified: !!request.blockchain?.transactionHash,
      contractAddress: process.env.CONTRACT_ADDRESS
    };

    res.json({
      success: true,
      verification,
      explorerUrl: verification.blockchainRecord ? 
        `https://sepolia.etherscan.io/tx/${verification.blockchainRecord.transactionHash}` : null
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get blockchain status
router.get('/status', auth, (req, res) => {
  const status = blockchainService.getBlockchainStatus();
  res.json({
    success: true,
    blockchain: status,
    contractAddress: process.env.CONTRACT_ADDRESS
  });
});

// Add these routes to your existing blockchainRoutes.js

// Test contract connection
router.post('/test-contract', auth, async (req, res) => {
  try {
    console.log('🔍 Testing contract connection...');
    
    const status = {
      isConnected: blockchainService.isConnected,
      hasGas: blockchainService.hasGas,
      contract: !!blockchainService.contract,
      contractAddress: blockchainService.contractAddress
    };
    
    console.log('🔍 Contract status:', status);
    
    if (blockchainService.contract) {
      // Test reading from contract
      const owner = await blockchainService.contract.methods.owner().call();
      const totalAdoptions = await blockchainService.contract.methods.totalAdoptions().call();
      
      status.contractReadTest = {
        owner: owner,
        totalAdoptions: totalAdoptions.toString(),
        success: true
      };
    }
    
    res.json({
      success: true,
      message: 'Contract test completed',
      status: status
    });
    
  } catch (error) {
    console.log('❌ Contract test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test adoption recording
router.post('/test-adoption', auth, async (req, res) => {
  try {
    const { petId, petName, breed } = req.body;
    
    console.log('🔍 Testing adoption recording...', { petId, petName, breed });
    
    const testData = {
      pet: { 
        _id: petId || 'test_123', 
        name: petName || 'Test Pet', 
        breed: breed || 'Test Breed' 
      },
      adopter: { 
        name: 'Test Adopter' 
      },
      organization: { 
        _id: 'test_org', 
        name: 'Test Shelter' 
      }
    };
    
    const result = await blockchainService.recordAdoptionOnChain(testData);
    
    console.log('🔍 Adoption recording result:', result);
    
    res.json({
      success: true,
      message: 'Adoption recording test completed',
      result: result,
      realTransaction: !result.simulated
    });
    
  } catch (error) {
    console.log('❌ Adoption recording test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// TEMPORARY PUBLIC TEST ROUTES - REMOVE AUTH FOR TESTING

// Public blockchain status check
router.get('/public-status', async (req, res) => {
  try {
    console.log('🔍 PUBLIC: Checking blockchain service status...');
    
    const status = {
      isConnected: blockchainService.isConnected,
      hasGas: blockchainService.hasGas,
      contract: !!blockchainService.contract,
      contractAddress: blockchainService.contractAddress,
      env: {
        CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS ? 'SET' : 'MISSING',
        INFURA_PROJECT_ID: process.env.INFURA_PROJECT_ID ? 'SET' : 'MISSING', 
        WALLET_PRIVATE_KEY: process.env.WALLET_PRIVATE_KEY ? 'SET' : 'MISSING'
      }
    };
    
    console.log('🔍 Blockchain Service Status:', status);
    
    // Test contract if available
    if (blockchainService.contract) {
      try {
        const owner = await blockchainService.contract.methods.owner().call();
        const totalAdoptions = await blockchainService.contract.methods.totalAdoptions().call();
        
        status.contractTest = {
          owner: owner,
          totalAdoptions: totalAdoptions.toString(),
          success: true
        };
      } catch (contractError) {
        status.contractTest = {
          success: false,
          error: contractError.message
        };
      }
    }
    
    res.json({
      success: true,
      message: 'Blockchain status check completed',
      status: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.log('Public status check failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

// Public contract test
router.post('/public-test-contract', async (req, res) => {
  try {
    console.log('🔍 PUBLIC: Testing contract connection...');
    
    const status = {
      isConnected: blockchainService.isConnected,
      hasGas: blockchainService.hasGas,
      contract: !!blockchainService.contract
    };
    
    let contractTest = {};
    
    if (blockchainService.contract) {
      try {
        const owner = await blockchainService.contract.methods.owner().call();
        const totalAdoptions = await blockchainService.contract.methods.totalAdoptions().call();
        
        contractTest = {
          owner: owner,
          totalAdoptions: totalAdoptions.toString(),
          success: true
        };
        
        console.log(' Contract read successful:', contractTest);
      } catch (error) {
        contractTest = {
          success: false,
          error: error.message
        };
        console.log(' Contract read failed:', error.message);
      }
    }
    
    res.json({
      success: true,
      message: 'Public contract test completed',
      status: status,
      contractTest: contractTest,
      realMode: status.isConnected && status.hasGas && status.contract
    });
    
  } catch (error) {
    console.log(' Public contract test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;