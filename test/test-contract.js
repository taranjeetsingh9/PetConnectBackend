require('dotenv').config();
const { Web3 } = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

async function testContract() {
  console.log('🧪 Testing Smart Contract...\n');
  
  try {
    const provider = new HDWalletProvider({
      privateKeys: [process.env.WALLET_PRIVATE_KEY],
      providerOrUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    });

    const web3 = new Web3(provider);
    
    const contractABI = [
      "constructor()",
      "event AdoptionRecorded(string indexed petId, address indexed adopter, address indexed shelter, uint256 timestamp, string petName)",
      "function adoptionRecords(string) view returns (string petId, string petName, string breed, uint256 timestamp, address adopter, address shelter, string healthSummary, string trainingSummary)",
      "function getAdoptionRecord(string _petId) view returns (string, string, uint256, address, address, string)",
      "function owner() view returns (address)",
      "function petAdopted(string) view returns (bool)",
      "function recordAdoption(string _petId, string _petName, string _breed, address _adopter, string _healthSummary, string _trainingSummary) returns (bool)",
      "function totalAdoptions() view returns (uint256)",
      "function verifyAdoption(string _petId) view returns (bool)"
    ];

    const contractAddress = process.env.CONTRACT_ADDRESS;
    
    const contract = new web3.eth.Contract(contractABI, contractAddress);
    
    // Test reading from contract
    const owner = await contract.methods.owner().call();
    const totalAdoptions = await contract.methods.totalAdoptions().call();
    
    console.log(' Contract Connection Successful!');
    console.log('   Contract Owner:', owner);
    console.log('   Total Adoptions:', totalAdoptions);
    console.log('   Contract Address:', contractAddress);
    
  } catch (error) {
    console.log(' Contract test failed:', error.message);
  }
}

testContract();