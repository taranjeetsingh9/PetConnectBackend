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

module.exports = router;