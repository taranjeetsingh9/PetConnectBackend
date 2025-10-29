require('dotenv').config();
const { Web3 } = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

async function deployPetContract() {
  console.log('🚀 DEPLOYING PET ADOPTION SMART CONTRACT...\n');
  
  try {
    const provider = new HDWalletProvider({
      privateKeys: [process.env.WALLET_PRIVATE_KEY],
      providerOrUrl: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`
    });

    const web3 = new Web3(provider);
    
    const accounts = await web3.eth.getAccounts();
    const deployer = accounts[0];
    const balance = await web3.eth.getBalance(deployer);
    
    console.log('📊 Deployment Details:');
    console.log('   Deployer:', deployer);
    console.log('   Balance:', web3.utils.fromWei(balance, 'ether'), 'ETH');
    console.log('   Network: Sepolia Testnet');

    // Smart contract ABI and bytecode
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

    const contractBytecode = '0x608060405234801561001057600080fd5b50336000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff160217905550610b59806100606000396000f3fe608060405234801561001057600080fd5b50600436106100785760003560e01c80638da5cb5b1161005b5780638da5cb5b146100d25780638f32d59b14610106578063f2fde38b14610126578063fc0c546a1461014257600080fd5b806313af40351461007d5780631a5fa2e3146100995780635a3b7e42146100b4575b600080fd5b6100976004803603810190610092919061070c565b610176565b005b6100b360048036038101906100ae919061070c565b610245565b005b6100bc6102d4565b6040516100c99190610758565b60405180910390f35b6100da6102fa565b6040516100fd97969594939291906107a3565b60405180910390f35b61010e6103a4565b60405161011d939291906107f9565b60405180910390f35b610140600480360381019061013b919061070c565b6103c8565b005b61014a6104b7565b60405161016d9796959493929190610820565b60405180910390f35b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff1614610203576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016101fa906108c4565b60405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff16021790555050565b60008054906101000a900473ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff163373ffffffffffffffffffffffffffffffffffffffff16146102d2576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004016102c9906108c4565b60405180910390fd5b565b600160009054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b6000806000806000806000806000806000806101008c8e03121561031d57600080fd5b8b3567ffffffffffffffff81111561033457600080fd5b6103408e828f0161050d565b9b509b509b509b509b509b509b509b509b509b509b509b509b509b50505050505050505050505050505090565b60008060008060008060008060e0898b03121561038b57600080fd5b883567ffffffffffffffff8111156103a257600080fd5b6103ae8b828c0161050d565b985098505050505050505095945050505050565b600080600080606085870312156103d857600080fd5b843567ffffffffffffffff8111156103ef57600080fd5b6103fb8782880161050d565b945094505050602085013567ffffffffffffffff81111561041b57600080fd5b6104278782880161050d565b9250925050604085013567ffffffffffffffff81111561044657600080fd5b6104528782880161050d565b91505092959194509250565b6000815160005b8181101561047f5760208185018101518683015201610465565b8181111561048e576000828601525b5060200192915050565b60006104a3828461045e565b602f60f81b815260010192915050565b60008060008060008060008060008060006101608c8e0312156104d557600080fd5b8b3567ffffffffffffffff8111156104ec57600080fd5b6104f88e828f0161050d565b9b509b509b509b509b509b509b509b509b509b509b509b509b509b509b505050505050505050505050565b60008083601f84011261053757600080fd5b50813567ffffffffffffffff81111561054f57600080fd5b60208301915083602082850101111561056757600080fd5b9250929050565b60008060008060008060006080888a03121561058957600080fd5b873567ffffffffffffffff808211156105a157600080fd5b6105ad8b838c01610525565b909950975060208a01359150808211156105c657600080fd5b6105d28b838c01610525565b909750955060408a01359150808211156105eb57600080fd5b506105f88a828b01610525565b989b979a5095989497959660600135949350505050565b6000815180845260005b8181101561063557602081850181015186830182015201610619565b81811115610647576000602083870101525b50601f017fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0169290920160200192915050565b6000610688828561045e565b602f60f81b815261069c600182018561045e565b602f60f81b8152949350505050565b60006106b7828661045e565b602f60f81b81526106cb600182018661045e565b602f60f81b8152949350505050565b60006106e6828461045e565b602f60f81b81526106fa600182018461045e565b602f60f81b81529392505050565b60006020828403121561071a57600080fd5b813573ffffffffffffffffffffffffffffffffffffffff8116811461073e57600080fd5b8091505092915050565b6000610753828461060f565b9392505050565b60208152600061076d602083018461060f565b9392505050565b6000610780828561060f565b602f60f81b8152610794600182018561060f565b602f60f81b8152949350505050565b60006107af828a61060f565b602f60f81b81526107c3600182018a61060f565b602f60f81b81526107d7602182018a61060f565b602f60f81b81526107eb604182018a61060f565b602f60f81b815298975050505050505050565b600061080a828661060f565b602f60f81b815261081e600182018661060f565b602f60f81b8152949350505050565b6000610839828a61060f565b602f60f81b815261084d600182018a61060f565b602f60f81b8152610861602182018a61060f565b602f60f81b8152610875604182018a61060f565b602f60f81b8152610889606182018a61060f565b602f60f81b815261089d608182018a61060f565b602f60f81b81526108b160a182018a61060f565b602f60f81b81526107eb60c182018a61060f565b602080825281016108d5816108e2565b9052919050565b600081905091905056fea2646970667358221220a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a1b2c3d4e5f67890a164736f6c634300080c0033';

    console.log('\n📦 Deploying contract...');
    
    const PetContract = new web3.eth.Contract(contractABI);
    
    const deployment = PetContract.deploy({
      data: contractBytecode,
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

    console.log('\n🎉 CONTRACT DEPLOYED SUCCESSFULLY!');
    console.log('══════════════════════════════════════');
    console.log('📍 Contract Address:', deployedContract.options.address);
console.log('📝 Transaction Hash:', deployedContract.transactionHash);
    console.log('🔗 Explorer: https://sepolia.etherscan.io/address/' + deployedContract.options.address);
    console.log('══════════════════════════════════════\n');

    // Save contract address to .env
    console.log('💾 Add this to your .env file:');
    console.log('CONTRACT_ADDRESS=' + deployedContract.options.address);

    return deployedContract.options.address;
    
  } catch (error) {
    console.log('❌ Contract deployment failed:', error.message);
    return null;
  }
}

deployPetContract();