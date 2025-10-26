const Organization = require('../models/Organization');

class OrganizationService {
  /**
   * Fetch all organizations
   */
  async getAllOrganizations() {
    return await Organization.find().select('name type contact');
  }

  /**
   * Fetch a single organization by ID
   */
  async getOrganizationById(id) {
    return await Organization.findById(id).populate('staff', 'name email');
  }

  /**
   * Create a new organization
   */
  async createOrganization(data) {
    const org = new Organization(data);
    return await org.save();
  }

  /**
   * Update organization details
   */
  async updateOrganization(id, updateFields) {
    return await Organization.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );
  }

  /**
   * Delete an organization
   */
  async deleteOrganization(id) {
    const org = await Organization.findById(id);
    if (!org) throw new Error('Organization not found');
    await org.deleteOne();
    return org;
  }
}

// Create an instance for easy use
const organizationService = new OrganizationService();

// Export both class and instance for flexibility
module.exports = {
  OrganizationService,
  organizationService,

  // Legacy exports (for backward compatibility)
  getAllOrganizations: organizationService.getAllOrganizations.bind(organizationService),
  getOrganizationById: organizationService.getOrganizationById.bind(organizationService),
  createOrganization: organizationService.createOrganization.bind(organizationService),
  updateOrganization: organizationService.updateOrganization.bind(organizationService),
  deleteOrganization: organizationService.deleteOrganization.bind(organizationService),
};
