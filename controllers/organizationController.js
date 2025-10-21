const organizationService = require('../services/organizationService');
const logActivity = require('../utils/logActivity');

// GET all organizations
exports.getAllOrganizations = async (req, res) => {
  try {
    const orgs = await organizationService.getAllOrganizations();
    res.json(orgs);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// GET organization by ID
exports.getOrganizationById = async (req, res) => {
  try {
    const org = await organizationService.getOrganizationById(req.params.id);
    if (!org) return res.status(404).json({ msg: 'Organization not found' });
    res.json(org);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// POST create new organization (Admin only)
exports.createOrganization = async (req, res) => {
  try {
    const { name, type, contact } = req.body;
    if (!name || !type) return res.status(400).json({ msg: 'Name and type are required' });

    const org = await organizationService.createOrganization({ name, type, contact });

    // Log activity
    await logActivity({
      userId: req.user.id,
      role: 'admin',
      action: 'Created Organization',
      target: org._id,
      targetModel: 'Organization',
      details: { name, type, contact },
      ipAddress: req.ip
    });

    res.json(org);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// PATCH update organization (Admin only)
exports.updateOrganization = async (req, res) => {
  try {
    const updateFields = {};
    if (req.body.name) updateFields.name = req.body.name;
    if (req.body.type) updateFields.type = req.body.type;
    if (req.body.contact) updateFields.contact = req.body.contact;

    const org = await organizationService.updateOrganization(req.params.id, updateFields);
    if (!org) return res.status(404).json({ msg: 'Organization not found' });

    res.json(org);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};

// DELETE organization (Admin only)
exports.deleteOrganization = async (req, res) => {
  try {
    const org = await organizationService.deleteOrganization(req.params.id);
    res.json({ msg: 'Organization deleted successfully', org });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: 'Server error' });
  }
};
