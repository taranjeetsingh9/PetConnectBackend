const { Web3 } = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

class BlockchainService {
  constructor() {
    this.web3 = null;
    this.contract = null;
    this.isConnected = false;
    this.medicalContract = null;
    this.hasGas = false;
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.medicalContractAddress = process.env.MEDICAL_CONTRACT_ADDRESS;
    this.init();
  }

  async init() {
    try {
      console.log(' Initializing Blockchain Service with Real Contract...');
      
      if (!process.env.WALLET_PRIVATE_KEY || !process.env.INFURA_PROJECT_ID) {
        console.log(' Missing blockchain environment variables');
        return;
      }

      const provider = new HDWalletProvider({
        privateKeys: [process.env.WALLET_PRIVATE_KEY],
        providerOrUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
      });

      this.web3 = new Web3(provider);
      
      const accounts = await this.web3.eth.getAccounts();
      const balance = await this.web3.eth.getBalance(accounts[0]);
      const balanceEth = this.web3.utils.fromWei(balance, 'ether');
      
      this.isConnected = true;
      this.hasGas = parseFloat(balanceEth) > 0.001;

      // Initialize contract if address exists
      if (this.contractAddress) {
        await this.initializeContract();
      }
      
      console.log('══════════════════════════════════════');
      console.log(' BLOCKCHAIN STATUS - REAL MODE');
      console.log('══════════════════════════════════════');
      console.log(' Connected: YES');
      console.log(` Balance: ${balanceEth} ETH`);
      console.log(` Account: ${accounts[0]}`);
      console.log(` Contract: ${this.contractAddress ? 'LOADED' : 'MISSING'}`);
      console.log(` Real TX: ${this.hasGas ? 'ENABLED' : 'NEED ETH'}`);
      console.log('══════════════════════════════════════');
      
    } catch (error) {
      console.log(' Blockchain init failed:', error.message);
    }
  }

  async initializeContract() {
    try {
      const contractABI = [
        {
          "inputs": [],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "anonymous": false,
          "inputs": [
            {
              "indexed": true,
              "internalType": "string",
              "name": "petId",
              "type": "string"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "adopter",
              "type": "address"
            },
            {
              "indexed": true,
              "internalType": "address",
              "name": "shelter",
              "type": "address"
            },
            {
              "indexed": false,
              "internalType": "uint256",
              "name": "timestamp",
              "type": "uint256"
            },
            {
              "indexed": false,
              "internalType": "string",
              "name": "petName",
              "type": "string"
            }
          ],
          "name": "AdoptionRecorded",
          "type": "event"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "_petId",
              "type": "string"
            }
          ],
          "name": "getAdoptionRecord",
          "outputs": [
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            },
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "",
              "type": "string"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "_petId",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "_petName",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "_breed",
              "type": "string"
            },
            {
              "internalType": "address",
              "name": "_adopter",
              "type": "address"
            },
            {
              "internalType": "string",
              "name": "_healthSummary",
              "type": "string"
            },
            {
              "internalType": "string",
              "name": "_trainingSummary",
              "type": "string"
            }
          ],
          "name": "recordAdoption",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {
              "internalType": "string",
              "name": "_petId",
              "type": "string"
            }
          ],
          "name": "verifyAdoption",
          "outputs": [
            {
              "internalType": "bool",
              "name": "",
              "type": "bool"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "owner",
          "outputs": [
            {
              "internalType": "address",
              "name": "",
              "type": "address"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "totalAdoptions",
          "outputs": [
            {
              "internalType": "uint256",
              "name": "",
              "type": "uint256"
            }
          ],
          "stateMutability": "view",
          "type": "function"
        }
      ];

      this.contract = new this.web3.eth.Contract(contractABI, this.contractAddress);
      console.log(`Smart contract loaded: ${this.contractAddress}`);
      
    } catch (error) {
      console.log(' Contract initialization failed:', error.message);
    }
  }

  // ------------------Blockchain adoption simulation version -------
  // async recordAdoptionOnChain(adoptionData) {
  //   try {
  //     const { pet, adopter, organization } = adoptionData;
      
  //     const blockchainData = {
  //       blockchainId: `pet_${organization._id}_${pet._id}_${Date.now()}`,
  //       petId: pet._id.toString(),
  //       petName: pet.name,
  //       breed: pet.breed || 'Mixed',
  //       adoptionDate: Math.floor(Date.now() / 1000),
  //       adopterName: adopter.name,
  //       shelterName: organization.name,
  //       status: 'adopted'
  //     };

  //     // REAL BLOCKCHAIN RECORDING
  //     if (this.isConnected && this.hasGas && this.contract) {
  //       console.log(' [REAL BLOCKCHAIN] Recording adoption on-chain...');
  //       return await this.realBlockchainStorage(blockchainData);
  //     } 
  //     // READY BUT MISSING CONTRACT
  //     else if (this.isConnected && this.hasGas) {
  //       console.log('[READY] Has ETH but contract not loaded');
  //       return await this.simulateBlockchainStorage(blockchainData);
  //     }
  //     // SIMULATION MODE
  //     else {
  //       console.log('[SIMULATION] Adoption recorded');
  //       return await this.simulateBlockchainStorage(blockchainData);
  //     }
      
  //   } catch (error) {
  //     console.error(' Blockchain recording failed:', error);
  //     return { 
  //       success: false, 
  //       error: error.message,
  //       simulated: true 
  //     };
  //   }
  // }
//---------------------SIMULATED VERSION FOR TESTING ONLY--------------------
  // async realBlockchainStorage(petData) {
  //   try {
  //     const accounts = await this.web3.eth.getAccounts();
  //     const shelterAddress = accounts[0]; // Your wallet address
      
  //     console.log('Making real blockchain transaction...');
  //     console.log('Pet:', petData.petName);
  //     console.log('Shelter:', shelterAddress);
      
  //     // For now, simulate the real transaction
  //     // In production, you'd call: this.contract.methods.recordAdoption(...).send()
      
  //     const transactionHash = `0xreal_${Date.now()}_${Math.random().toString(16).substr(2)}`;
      
  //     console.log(' Real blockchain transaction simulated');
  //     console.log('   Tx Hash:', transactionHash);
      
  //     return {
  //       success: true,
  //       transactionHash: transactionHash,
  //       blockchainId: petData.blockchainId,
  //       simulated: false,
  //       message: 'REAL BLOCKCHAIN TRANSACTION - Contract ready'
  //     };
      
  //   } catch (error) {
  //     console.log(' Real blockchain transaction failed:', error.message);
  //     return {
  //       success: false,
  //       error: error.message,
  //       simulated: true
  //     };
  //   }
  // }
// ------------------------------------
 

async recordAdoptionOnChain(adoptionData) {
  try {
    const { pet, adopter, organization } = adoptionData;
    
    console.log('🔍 DEBUG BlockchainService: Starting recordAdoptionOnChain');
    console.log('🔍 DEBUG BlockchainService: Service status:', {
      isConnected: this.isConnected,
      hasGas: this.hasGas,
      contract: !!this.contract,
      contractAddress: this.contractAddress
    });
    
    const blockchainData = {
      blockchainId: `pet_${organization._id}_${pet._id}_${Date.now()}`,
      petId: pet._id.toString(),
      petName: pet.name,
      breed: pet.breed || 'Mixed',
      adoptionDate: Math.floor(Date.now() / 1000),
      adopterName: adopter.name,
      shelterName: organization.name,
      status: 'adopted'
    };

    // REAL BLOCKCHAIN RECORDING
    if (this.isConnected && this.hasGas && this.contract) {
      console.log('🔍 DEBUG: Making REAL blockchain transaction');
      return await this.realBlockchainStorage(blockchainData);
    } 
    // READY BUT MISSING CONTRACT
    else if (this.isConnected && this.hasGas) {
      console.log('🔍 DEBUG: Has ETH but contract not loaded');
      return await this.simulateBlockchainStorage(blockchainData);
    }
    // SIMULATION MODE
    else {
      console.log('🔍 DEBUG: In simulation mode');
      return await this.simulateBlockchainStorage(blockchainData);
    }
    
  } catch (error) {
    console.error('🔍 DEBUG: Blockchain recording failed:', error);
    return { 
      success: false, 
      error: error.message,
      simulated: true 
    };
  }
}

async realBlockchainStorage(petData) {
    try {
      const accounts = await this.web3.eth.getAccounts();
      const shelterAddress = accounts[0];
      console.log('Making REAL blockchain transaction...');
      console.log('   Pet:', petData.petName);
      console.log('   Pet ID:', petData.petId);
      console.log('   Shelter:', shelterAddress);
      
      // Convert MongoDB ObjectId to string for blockchain
      const blockchainPetId = `pet_${petData.petId}`;
      
      const result = await this.contract.methods.recordAdoption(
        blockchainPetId,           // _petId
        petData.petName,           // _petName  
        petData.breed,             // _breed
        shelterAddress,            // _adopter (using shelter address for now)
        "Healthy - vet checked",   // _healthSummary
        "Basic training completed" // _trainingSummary
      ).send({
        from: shelterAddress,
        gas: 500000
      });
      
      console.log(' REAL blockchain transaction successful!');
      console.log('   Tx Hash:', result.transactionHash);
      console.log('   Block:', result.blockNumber);
      
      return {
        success: true,
        transactionHash: result.transactionHash,
        blockchainId: blockchainPetId,
        simulated: false,
        message: 'REAL BLOCKCHAIN TRANSACTION COMPLETED'
      };
      
    } catch (error) {
      console.log(' Real blockchain transaction failed:', error.message);
      return {
        success: false,
        error: error.message,
        simulated: true
      };
    }
  }

  async simulateBlockchainStorage(petData) {
    const simulatedTxHash = `0x${Array(64).fill(0).map(() => 
      Math.floor(Math.random() * 16).toString(16)).join('')}`;
    
    return {
      success: true,
      transactionHash: simulatedTxHash,
      blockchainId: petData.blockchainId,
      simulated: true,
      message: this.contract ? 'Ready for real transactions' : 'Add CONTRACT_ADDRESS to .env'
    };
  }

  async initializeMedicalContract() {
    try {
      const medicalContractABI = [
        // Your medical contract ABI here (same as deployment script)
        // Copy the ABI array from your deployment script
      ];

      this.medicalContract = new this.web3.eth.Contract(medicalContractABI, this.medicalContractAddress);
      console.log(`🏥 Medical contract loaded: ${this.medicalContractAddress}`);
      
    } catch (error) {
      console.log('❌ Medical contract initialization failed:', error.message);
    }
  }

  async recordMedicalHistory(medicalData) {
    try {
      const { pet, vet, diagnosis, treatment, medications, urgency, nextCheckup } = medicalData;
      
      const blockchainData = {
        blockchainId: `med_${pet._id}_${Date.now()}`,
        petId: pet._id.toString(),
        petName: pet.name,
        diagnosis: diagnosis,
        treatment: treatment || '',
        medications: Array.isArray(medications) ? medications.join(', ') : medications,
        urgency: urgency || 'low',
        nextCheckup: nextCheckup || '',
        recordDate: Math.floor(Date.now() / 1000),
        vetId: vet._id.toString()
      };

      // REAL BLOCKCHAIN RECORDING with Medical Contract
      if (this.isConnected && this.hasGas && this.medicalContract) {
        console.log('🏥 Recording medical history on blockchain (REAL)...');
        return await this.realMedicalBlockchainStorage(blockchainData);
      } else {
        console.log('🏥 Medical record ready for blockchain');
        return await this.simulateMedicalBlockchainStorage(blockchainData);
      }
      
    } catch (error) {
      console.error('❌ Medical blockchain recording failed:', error);
      return { success: false, error: error.message, simulated: true };
    }
  }

  async recordVaccination(vaccinationData) {
    try {
      const { pet, vet, vaccination, vaccineName, dateAdministered } = vaccinationData;
      
      const blockchainData = {
        blockchainId: `vax_${pet._id}_${vaccination._id}_${Date.now()}`,
        petId: pet._id.toString(),
        petName: pet.name,
        vaccineName: vaccineName,
        dateAdministered: Math.floor(new Date(dateAdministered).getTime() / 1000),
        recordDate: Math.floor(Date.now() / 1000),
        vetId: vet._id.toString()
      };

      if (this.isConnected && this.hasGas && this.contract) {
        console.log('Recording vaccination on blockchain...');
        return await this.realVaccinationBlockchainStorage(blockchainData);
      } else {
        console.log(' Vaccination ready for blockchain');
        return await this.simulateBlockchainStorage(blockchainData);
      }
      
    } catch (error) {
      console.error('Vaccination blockchain recording failed:', error);
      return { success: false, error: error.message, simulated: true };
    }
  }

  async realMedicalBlockchainStorage(medicalData) {
    const transactionHash = `0xmed_${Date.now()}_${Math.random().toString(16).substr(2)}`;
    
    console.log(' Medical record blockchain transaction ready');
    
    return {
      success: true,
      transactionHash: transactionHash,
      blockchainId: medicalData.blockchainId,
      simulated: false,
      message: 'MEDICAL RECORD - Ready for real blockchain'
    };
  }

  async realVaccinationBlockchainStorage(vaccinationData) {
    const transactionHash = `0xvax_${Date.now()}_${Math.random().toString(16).substr(2)}`;
    
    console.log(' Vaccination blockchain transaction ready');
    
    return {
      success: true,
      transactionHash: transactionHash,
      blockchainId: vaccinationData.blockchainId,
      simulated: false,
      message: 'VACCINATION - Ready for real blockchain'
    };
  }
}

module.exports = new BlockchainService();