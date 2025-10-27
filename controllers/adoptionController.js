// controllers/adoptionController.js
const adoptionService = require('../services/adoptionService');

exports.requestAdoption = async (req, res) => {
  try {
    const result = await adoptionService.requestAdoption(req.user, req.params.petId);
    res.json(result);
  } catch (err) {
    console.error(' Error in requestAdoption:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Server Error' });
  }
};

exports.getOrganizationRequests = async (req, res) => {
  try {
    const result = await adoptionService.getOrganizationRequests(req.user.id);
    res.json(result);
  } catch (err) {
    console.error(' Error in getOrganizationRequests:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Server Error' });
  }
};

exports.updateRequestStatus = async (req, res) => {
  try {
    const result = await adoptionService.updateRequestStatus(req.user, req.params.id, req.body);
    res.json(result);
  } catch (err) {
    console.error(' Error in updateRequestStatus:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Server Error' });
  }
};

exports.getMyRequests = async (req, res) => {
  try {
    const result = await adoptionService.getMyRequests(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Error in getMyRequests:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Server Error' });
  }
};


exports.scheduleMeeting = async (req, res) => {
  try {
    const result = await adoptionService.scheduleMeeting(req.user, req.params.requestId, req.body.staffId, req.body.slot);
    res.json(result);
  } catch (err) {
    console.error('Error in scheduleMeeting:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Server Error' });
  }
};

exports.confirmMeeting = async (req, res) => {
  try {
    const result = await adoptionService.confirmMeeting(req.user, req.params.id, req.body.notes);
    res.json(result);
  } catch (err) {
    console.error('Error in confirmMeeting:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Server Error' });
  }
};

exports.sendMeetingReminder = async (req, res) => {
  try {
    const result = await adoptionService.sendMeetingReminder(req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Error in sendMeetingReminder:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Server Error' });
  }
};

// Get adopter's adopted pets for training requests
exports.getMyAdoptedPets = async (req, res) => {
  try {
    const result = await adoptionService.getMyAdoptedPets(req.user.id);
    res.json(result);
  } catch (err) {
    console.error('Error in getMyAdoptedPets:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Server Error' });
  }
};

exports.completeMeeting = async (req, res, next) => {
  try {
    const result = await adoptionService.completeMeeting(req.user, req.params.id, req.body.notes);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error in completeMeeting:', err);
    next(err);
  }
};

exports.submitMeetingFeedback = async (req, res) => {
  try {
    const result = await adoptionService.submitMeetingFeedback(req.user, req.params.id, req.body.feedback);
    res.json(result);
  } catch (err) {
    console.error('Error in submitMeetingFeedback:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Server Error' });
  }
};


exports.getRequestDetails = async (req, res) => {
  try {
    const result = await adoptionService.getRequestDetails(req.params.id, req.user.id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.cancelRequest = async (req, res) => {
  try {
    const result = await adoptionService.cancelRequest(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.rescheduleMeeting = async (req, res) => {
  try {
    const result = await adoptionService.rescheduleMeeting(req.user, req.params.id, req.body);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.getAdoptionStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const result = await adoptionService.getAdoptionStats(user.organization);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.bulkUpdateStatus = async (req, res) => {
  try {
    const result = await adoptionService.bulkUpdateStatus(req.user, req.body.requestIds, req.body.status);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.sendAdoptionAgreement = async (req, res) => {
  try {
    const result = await adoptionService.sendAdoptionAgreement(req.user, req.params.id, req.body.customClauses || []);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.signAgreement = async (req, res) => {
  try {
    const result = await adoptionService.signAgreement(req.user, req.params.agreementId, req.body.signature);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.processPayment = async (req, res) => {
  try {
    const result = await adoptionService.processPayment(req.user, req.params.id, req.body.paymentMethod, req.body.paymentDetails);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};

exports.getAgreementDetails = async (req, res) => {
  try {
    const result = await adoptionService.getAgreementDetails(req.user, req.params.agreementId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ msg: err.message });
  }
};