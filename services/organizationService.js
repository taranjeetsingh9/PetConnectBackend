const Organization = require('../models/Organization');

// Fetch all organizations
exports.getAllOrganizations = async () => {
    return await Organization.find().select('name type contact');
};

// Fetch organization by ID
exports.getOrganizationById = async (id) => {
    return await Organization.findById(id).populate('staff', 'name email');
};

// Create a new organization
exports.createOrganization = async (data) => {
    const org = new Organization(data);
    return await org.save();
};

// Update organization
exports.updateOrganization = async (id, updateFields) => {
    return await Organization.findByIdAndUpdate(id, { $set: updateFields }, { new: true });
};

// Delete organization
exports.deleteOrganization = async (id) => {
    const org = await Organization.findById(id);
    if (!org) throw new Error('Organization not found');
    await org.deleteOne();
    return org;
};
