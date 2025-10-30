require('dotenv').config();
const { Web3 } = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const path = require('path');

async function deployMedicalContract() {
  console.log('🏥 DEPLOYING PET MEDICAL HISTORY CONTRACT...\n');
  
  try {
    const provider = new HDWalletProvider({
      privateKeys: [process.env.WALLET_PRIVATE_KEY],
      providerOrUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    });

    const web3 = new Web3(provider);
    
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];
    const balance = await web3.eth.getBalance(deployer);
    
    console.log('📊 Medical Contract Deployment:');
    console.log('   Deployer:', deployer);
    console.log('   Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');

    // Medical contract ABI
    const medicalContractABI = [
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
            "name": "vetAddress",
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
            "name": "diagnosis",
            "type": "string"
          }
        ],
        "name": "MedicalRecordAdded",
        "type": "event"
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
            "name": "_diagnosis",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "_treatment",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "_medications",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "_urgency",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "_nextCheckup",
            "type": "string"
          }
        ],
        "name": "addMedicalRecord",
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
        "name": "getMedicalRecords",
        "outputs": [
          {
            "components": [
              {
                "internalType": "string",
                "name": "recordId",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "petId",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "diagnosis",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "treatment",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "medications",
                "type": "string"
              },
              {
                "internalType": "uint256",
                "name": "recordDate",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "vetAddress",
                "type": "address"
              },
              {
                "internalType": "string",
                "name": "urgency",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "nextCheckup",
                "type": "string"
              }
            ],
            "internalType": "struct PetMedicalHistory.MedicalRecord[]",
            "name": "",
            "type": "tuple[]"
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
      }
    ];

    const medicalContractBytecode = 'YOUR_MEDICAL_CONTRACT_BYTECODE_HERE';

    console.log('\n📦 Deploying medical contract...');
    
    const MedicalContract = new web3.eth.Contract(medicalContractABI);
    
    const deployment = MedicalContract.deploy({
      data: medicalContractBytecode,
      arguments: []
    });

    const gasEstimate = await deployment.estimateGas({ from: deployer });
    const gasPrice = await web3.eth.getGasPrice();
    
    console.log('   Gas Estimate:', gasEstimate);
    console.log('   Gas Price:', web3.utils.fromWei(gasPrice, 'gwei'), 'Gwei');
    
    const deployedContract = await deployment.send({
      from: deployer,
      gas: gasEstimate,
      gasPrice: gasPrice
    });

    console.log('\n🎉 MEDICAL CONTRACT DEPLOYED SUCCESSFULLY!');
    console.log('══════════════════════════════════════');
    console.log(' Contract Address:', deployedContract.options.address);
    console.log(' Transaction Hash:', deployedContract.transactionHash);
    console.log(' Explorer: https://sepolia.etherscan.io/address/' + deployedContract.options.address);
    console.log('══════════════════════════════════════\n');

    console.log('💾 Add this to your .env file:');
    console.log('MEDICAL_CONTRACT_ADDRESS=' + deployedContract.options.address);

    return deployedContract.options.address;
    
  } catch (error) {
    console.log('❌ Medical contract deployment failed:', error.message);
    return null;
  }
}

deployMedicalContract();