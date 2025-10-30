// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract PetAdoption {
    address public owner;
    uint256 public totalAdoptions;
    
    struct AdoptionRecord {
        string petId;
        string petName;
        string breed;
        uint256 timestamp;
        address adopter;
        address shelter;
        string healthSummary;
        string trainingSummary;
    }
    
    mapping(string => AdoptionRecord) public adoptionRecords;
    mapping(string => bool) public petAdopted;
    
    event AdoptionRecorded(
        string indexed petId,
        address indexed adopter,
        address indexed shelter,
        uint256 timestamp,
        string petName
    );
    
    constructor() {
        owner = msg.sender;
    }
    
    function recordAdoption(
        string memory _petId,
        string memory _petName,
        string memory _breed,
        address _adopter,
        string memory _healthSummary,
        string memory _trainingSummary
    ) external returns (bool) {
        require(!petAdopted[_petId], "Pet already adopted");
        require(msg.sender == owner, "Only owner can record adoptions");
        
        adoptionRecords[_petId] = AdoptionRecord({
            petId: _petId,
            petName: _petName,
            breed: _breed,
            timestamp: block.timestamp,
            adopter: _adopter,
            shelter: msg.sender,
            healthSummary: _healthSummary,
            trainingSummary: _trainingSummary
        });
        
        petAdopted[_petId] = true;
        totalAdoptions++;
        
        emit AdoptionRecorded(_petId, _adopter, msg.sender, block.timestamp, _petName);
        return true;
    }
    
    function getAdoptionRecord(string memory _petId) external view returns (
        string memory,
        string memory,
        uint256,
        address,
        address,
        string memory
    ) {
        AdoptionRecord memory record = adoptionRecords[_petId];
        return (
            record.petId,
            record.breed,
            record.timestamp,
            record.adopter,
            record.shelter,
            record.healthSummary
        );
    }
    
    function verifyAdoption(string memory _petId) external view returns (bool) {
        return petAdopted[_petId];
    }
}