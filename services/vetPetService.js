const Pet = require('../models/Pet');
const MedicalRecord = require('../models/MedicalRecord');
const Vaccination = require('../models/Vaccination');
const logActivity = require('../utils/logActivity');
const blockchainService = require('./blockchainService');

class VetPetService {
  static async getMyPatients(vetId) {
    return Pet.find({ vet: vetId })
      .populate('organization', 'name')
      .select('name breed age gender status healthNotes medicalHistory vaccinations healthHistory');
  }

  static async getPetMedicalHistory(vetId, petId) {
    const pet = await Pet.findById(petId)
      .populate('vet', 'name email')
      .populate('organization', 'name');

    if (!pet) throw { status: 404, message: 'Pet not found' };
    if (pet.vet && pet.vet._id.toString() !== vetId) throw { status: 403, message: 'Not assigned to this pet' };

    const medicalRecords = await MedicalRecord.find({ pet: petId }).populate('vet', 'name email').sort({ date: -1 });
    const vaccinations = await Vaccination.find({ pet: petId }).populate('vet', 'name email').sort({ dateAdministered: -1 });

    return { pet, medicalRecords, vaccinations };
  }

  static async createMedicalRecord(vetId, petId, data) {
    const pet = await Pet.findById(petId);
    if (!pet) throw { status: 404, message: 'Pet not found' };
    if (pet.vet && pet.vet.toString() !== vetId) throw { status: 403, message: 'Not assigned to this pet' };

    const medicalRecord = new MedicalRecord({
      pet: petId,
      vet: vetId,
      diagnosis: data.diagnosis,
      treatment: data.treatment,
      medications: data.medications || [],
      notes: data.notes,
      nextCheckup: data.nextCheckup ? new Date(data.nextCheckup) : undefined,
      urgency: data.urgency || 'low'
    });

    await medicalRecord.save();


    try {
      const blockchainResult = await blockchainService.recordMedicalHistory({
        pet: pet,
        vet: { _id: vetId }, // You'd need to get vet details
        medicalRecord: medicalRecord,
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        medications: data.medications,
        urgency: data.urgency
      });

      // Store blockchain reference
      medicalRecord.blockchain = {
        transactionHash: blockchainResult.transactionHash,
        blockchainId: blockchainResult.blockchainId,
        recordedAt: new Date(),
        simulated: blockchainResult.simulated
      };

      await medicalRecord.save();
      
      console.log('🔗 Medical record recorded on blockchain:', {
        pet: pet.name,
        diagnosis: data.diagnosis,
        txHash: blockchainResult.transactionHash
      });

    } catch (blockchainError) {
      console.error(' Blockchain recording failed, but medical record saved:', blockchainError);
    }

    pet.healthHistory.push({ notes: `Medical record: ${data.diagnosis}`, updatedBy: vetId, updatedAt: new Date() });
    await pet.save();

    await logActivity({
      userId: vetId,
      role: 'vet',
      action: 'Added Medical Record',
      target: petId,
      targetModel: 'Pet',
      details: `Added medical record for ${pet.name}: ${data.diagnosis} ${medicalRecord.blockchain ? '(Recorded on blockchain)' : ''}`
    });

    return medicalRecord;
  }

  static async createVaccination(vetId, petId, data) {
    const pet = await Pet.findById(petId);
    if (!pet) throw { status: 404, message: 'Pet not found' };
    if (pet.vet && pet.vet.toString() !== vetId) throw { status: 403, message: 'Not assigned to this pet' };

    const vaccination = new Vaccination({
      pet: petId,
      vet: vetId,
      vaccineName: data.vaccineName,
      dateAdministered: new Date(data.dateAdministered),
      nextDueDate: new Date(data.nextDueDate),
      notes: data.notes,
      boosterRequired: data.boosterRequired || false,
      batchNumber: data.batchNumber || ''
    });

    await vaccination.save();

    try {
      const blockchainResult = await blockchainService.recordVaccination({
        pet: pet,
        vet: { _id: vetId },
        vaccination: vaccination,
        vaccineName: data.vaccineName,
        dateAdministered: data.dateAdministered
      });

      vaccination.blockchain = {
        transactionHash: blockchainResult.transactionHash,
        blockchainId: blockchainResult.blockchainId,
        recordedAt: new Date(),
        simulated: blockchainResult.simulated
      };

      await vaccination.save();

      console.log(' Vaccination recorded on blockchain:', {
        pet: pet.name,
        vaccine: data.vaccineName,
        txHash: blockchainResult.transactionHash
      });

    } catch (blockchainError) {
      console.error(' Blockchain recording failed, but vaccination saved:', blockchainError);
    }

    pet.vaccinations.push({ name: data.vaccineName, date: new Date(data.dateAdministered) });
    await pet.save();

    await logActivity({
      userId: vetId,
      role: 'vet',
      action: 'Added Vaccination',
      target: petId,
      targetModel: 'Pet',
      details: `Added vaccination for ${pet.name}: ${data.vaccineName} ${vaccination.blockchain ? '(Recorded on blockchain)' : ''}`
    });

    return vaccination;
  }
  
  static async getOverdueVaccinations(vetId) {
    const today = new Date();
  
    const vaccinations = await Vaccination.find({
      vet: vetId,
      nextDueDate: { $lt: today },
      completed: true
    })
    .populate({
      path: 'pet',
      select: 'name breed age gender isDeleted',
      match: { isDeleted: false }
    })
    .lean();
  
    // Filter out vaccinations where pet couldn't be populated
    return vaccinations.filter(v => v.pet && !v.pet.isDeleted);
  }
  

  static async getUpcomingCheckups(vetId) {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    return MedicalRecord.find({
      vet: vetId,
      nextCheckup: { $gte: today, $lte: nextWeek },
      followUpRequired: true
    }).populate('pet', 'name breed status');
  }
}

module.exports = VetPetService;
