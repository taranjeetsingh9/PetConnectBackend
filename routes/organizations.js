const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const auth = require('../middleware/auth');
const roleAuth = require('../middleware/roleAuth'); 

// ------------------------
// Public routes (any authenticated user)
// ------------------------
router.get('/', auth, organizationController.getAllOrganizations);
router.get('/:id', auth, organizationController.getOrganizationById);

// ------------------------
// Admin only routes
// ------------------------
router.post('/', auth, roleAuth(['admin']), organizationController.createOrganization);
router.patch('/:id', auth, roleAuth(['admin']), organizationController.updateOrganization);
router.delete('/:id', auth, roleAuth(['admin']), organizationController.deleteOrganization);

module.exports = router;


