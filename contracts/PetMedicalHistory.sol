// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PetMedicalHistory {
    
    struct MedicalRecord {
        string recordId;
        string petId;
        string diagnosis;
        string treatment;
        string medications;
        uint256 recordDate;
        address vetAddress;
        string urgency;
        string nextCheckup;
    }
    
    // Mapping from petId to array of medical records
    mapping(string => MedicalRecord[]) public petMedicalRecords;
    
    address public owner;
    uint256 public totalMedicalRecords;
    
    event MedicalRecordAdded(
        string indexed petId,
        address indexed vetAddress,
        uint256 timestamp,
        string diagnosis
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
        totalMedicalRecords = 0;
    }
    
    function addMedicalRecord(
        string memory _petId,
        string memory _diagnosis,
        string memory _treatment,
        string memory _medications,
        string memory _urgency,
        string memory _nextCheckup
    ) public returns (bool) {
        
        require(bytes(_petId).length > 0, "Pet ID required");
        require(bytes(_diagnosis).length > 0, "Diagnosis required");
        
        // Create unique record ID
        string memory recordId = string(abi.encodePacked(
            _petId, 
            "_med_", 
            toString(block.timestamp)
        ));
        
        MedicalRecord memory newRecord = MedicalRecord({
            recordId: recordId,
            petId: _petId,
            diagnosis: _diagnosis,
            treatment: _treatment,
            medications: _medications,
            recordDate: block.timestamp,
            vetAddress: msg.sender,
            urgency: _urgency,
            nextCheckup: _nextCheckup
        });
        
        // Add to pet's medical records
        petMedicalRecords[_petId].push(newRecord);
        totalMedicalRecords++;
        
        emit MedicalRecordAdded(_petId, msg.sender, block.timestamp, _diagnosis);
        
        return true;
    }
    
    function getMedicalRecords(string memory _petId) public view returns (MedicalRecord[] memory) {
        return petMedicalRecords[_petId];
    }
    
    function getMedicalRecordsCount(string memory _petId) public view returns (uint256) {
        return petMedicalRecords[_petId].length;
    }
    
    function getTotalRecords() public view returns (uint256) {
        return totalMedicalRecords;
    }
    
    // Helper function to convert uint to string
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}