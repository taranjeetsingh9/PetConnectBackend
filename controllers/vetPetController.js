const VetPetService = require('../services/vetPetService');

class VetPetController {
  static async getMyPatients(req, res) {
    try {
      const pets = await VetPetService.getMyPatients(req.user.id);
      res.json({ success: true, count: pets.length, pets });
    } catch (error) {
      res.status(500).json({ success: false, msg: error.message || 'Server error' });
    }
  }

  static async getPetMedicalHistory(req, res) {
    try {
      const result = await VetPetService.getPetMedicalHistory(req.user.id, req.params.petId);
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, msg: error.message || 'Server error' });
    }
  }

  static async createMedicalRecord(req, res) {
    try {
      const record = await VetPetService.createMedicalRecord(req.user.id, req.params.petId, req.body);
      res.status(201).json({ success: true, message: 'Medical record created successfully', medicalRecord: record });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, msg: error.message || 'Server error' });
    }
  }

  static async createVaccination(req, res) {
    try {
      const vaccination = await VetPetService.createVaccination(req.user.id, req.params.petId, req.body);
      res.status(201).json({ success: true, message: 'Vaccination recorded successfully', vaccination });
    } catch (error) {
      res.status(error.status || 500).json({ success: false, msg: error.message || 'Server error' });
    }
  }

  static async getOverdueVaccinations(req, res) {
    try {
      const overdue = await VetPetService.getOverdueVaccinations(req.user.id);
      res.json({ success: true, count: overdue.length, overdueVaccinations: overdue });
    } catch (error) {
      res.status(500).json({ success: false, msg: 'Server error' });
    }
  }

  static async getUpcomingCheckups(req, res) {
    try {
      const upcoming = await VetPetService.getUpcomingCheckups(req.user.id);
      res.json({ success: true, count: upcoming.length, upcomingCheckups: upcoming });
    } catch (error) {
      res.status(500).json({ success: false, msg: 'Server error' });
    }
  }
}

module.exports = VetPetController;
