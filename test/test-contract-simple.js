require('dotenv').config({ path: __dirname + '/../.env' });
const { Web3 } = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

async function testContract() {
  console.log('🧪 Testing Smart Contract Connection...\n');
  
  try {
    const provider = new HDWalletProvider({
      privateKeys: [process.env.WALLET_PRIVATE_KEY],
      providerOrUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    });

    const web3 = new Web3(provider);
    
    // Use the correct ABI format (array of objects)
    const contractABI = [
      {
        "inputs": [],
        "name": "owner",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "totalAdoptions",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [{"internalType": "string", "name": "_petId", "type": "string"}],
        "name": "verifyAdoption",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
      }
    ];

    const contractAddress = process.env.CONTRACT_ADDRESS;
    
    console.log('📋 Contract Details:');
    console.log('   Address:', contractAddress);
    console.log('   Network: Sepolia');
    
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    
    // Test reading from contract
    console.log('🔍 Reading contract data...');
    const owner = await contract.methods.owner().call();
    const totalAdoptions = await contract.methods.totalAdoptions().call();
    
    console.log('✅ Contract Connection Successful!');
    console.log('   Contract Owner:', owner);
    console.log('   Total Adoptions:', totalAdoptions);
    
    // Test if owner matches deployer
    const expectedOwner = '0x4472F44bFE35A66107d9c6e135F9F14dBe19620B';
    if (owner.toLowerCase() === expectedOwner.toLowerCase()) {
      console.log('✅ Owner matches deployer - Contract is working!');
    } else {
      console.log('❌ Owner does not match deployer');
      console.log('   Expected:', expectedOwner);
      console.log('   Got:', owner);
    }
    
  } catch (error) {
    console.log('❌ Contract test failed:', error.message);
    if (error.message.includes('owner')) {
      console.log('💡 The contract might not be deployed or ABI is incorrect');
    }
  }
}

testContract();