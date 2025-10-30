const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const AdoptionRequest = require('../models/AdopterRequest');
const Pet = require('../models/Pet');

// Get blockchain history for a pet
router.get('/pets/:petId/blockchain-history', auth, async (req, res) => {
  try {
    const { petId } = req.params;
    
    const pet = await Pet.findById(petId);
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }

    // Get adoption requests for this pet
    const adoptionRequests = await AdoptionRequest.find({ pet: petId })
      .populate('adopter organization')
      .sort({ createdAt: -1 });

    const blockchainHistory = adoptionRequests
      .filter(request => request.blockchain)
      .map(request => ({
        type: 'adoption',
        petId: pet._id,
        petName: pet.name,
        adopterName: request.adopter.name,
        organizationName: request.organization.name,
        blockchainData: request.blockchain,
        date: request.finalizedAt || request.createdAt,
        status: request.status,
        explorerUrl: `https://sepolia.etherscan.io/tx/${request.blockchain.transactionHash}`
      }));

    // Add pet's blockchain ID if exists
    if (pet.blockchainId) {
      blockchainHistory.unshift({
        type: 'pet_registration',
        petId: pet._id,
        petName: pet.name,
        blockchainId: pet.blockchainId,
        date: pet.createdAt,
        message: 'Pet registered in system'
      });
    }

    res.json({
      success: true,
      pet: {
        id: pet._id,
        name: pet.name,
        breed: pet.breed,
        blockchainId: pet.blockchainId
      },
      blockchainHistory,
      totalRecords: blockchainHistory.length
    });

  } catch (error) {
    console.error('Blockchain history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify specific adoption on blockchain
router.get('/adoptions/:requestId/verify', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const request = await AdoptionRequest.findById(requestId)
      .populate('pet adopter organization');

    if (!request) {
      return res.status(404).json({ error: 'Adoption request not found' });
    }

    const verification = {
      requestId: request._id,
      petId: request.pet._id,
      petName: request.pet.name,
      adopterName: request.adopter.name,
      organizationName: request.organization.name,
      adoptionDate: request.finalizedAt,
      blockchainRecord: request.blockchain,
      verified: !!request.blockchain?.transactionHash,
      contractAddress: process.env.CONTRACT_ADDRESS
    };

    // Add explorer URL if transaction exists
    if (verification.blockchainRecord?.transactionHash) {
      verification.explorerUrl = `https://sepolia.etherscan.io/tx/${verification.blockchainRecord.transactionHash}`;
    }

    res.json({
      success: true,
      verification,
      message: verification.verified ? 
        ' Adoption verified on blockchain' : 
        'Adoption not yet recorded on blockchain'
    });

  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;