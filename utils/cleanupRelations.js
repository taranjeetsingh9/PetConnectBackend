const Vaccination = require('../models/Vaccination');
const Appointment = require('../models/Appointment');
const AdopterRequest = require('../models/AdopterRequest');

async function softDeletePetRelations(petId) {
  // Mark related records as inactive or remove link to deleted pet
  await Promise.all([
    Vaccination.updateMany({ pet: petId }, { $set: { isActive: false } }),
    Appointment.updateMany({ pet: petId }, { $set: { isActive: false } }),
    AdopterRequest.updateMany({ pet: petId }, { $set: { pet: null, note: 'Pet deleted from system' } }),
  ]);
}

module.exports = softDeletePetRelations;
