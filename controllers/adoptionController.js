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
