const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Pet = require('../models/Pet');
const AdoptionRequest = require('../models/AdopterRequest');
const Organization = require('../models/Organization');
const ActivityLog = require('../models/ActivityLog'); // Your activity log model
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const logActivity = require('../utils/logActivity');

// ========================
// 📊 ANALYTICS & OVERVIEW
// ========================

// ✅ GET platform analytics dashboard
router.get('/analytics', auth, isAdmin, async (req, res) => {
    try {
        console.log(`📊 Admin ${req.user.id} fetching platform analytics`);

        const [
            totalUsers,
            totalPets,
            totalAdoptionRequests,
            totalOrganizations,
            recentAdoptions
        ] = await Promise.all([
            User.countDocuments(),
            Pet.countDocuments(),
            AdoptionRequest.countDocuments(),
            Organization.countDocuments(),
            AdoptionRequest.countDocuments({ status: 'finalized' })
        ]);

        // User distribution by role
        const userDistribution = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        // Pet distribution by status
        const petDistribution = await Pet.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        res.json({
            success: true,
            analytics: {
                overview: {
                    totalUsers,
                    totalPets,
                    totalAdoptionRequests,
                    totalOrganizations,
                    recentAdoptions
                },
                userDistribution,
                petDistribution
            }
        });

    } catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({
            success: false,
            msg: 'Server error while fetching analytics'
        });
    }
});

// ========================
// 👥 USER MANAGEMENT
// ========================

// ✅ GET all users with pagination and filters
router.get('/users', auth, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const role = req.query.role;
        const search = req.query.search;

        let query = {};
        
        if (role && role !== 'all') query.role = role;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const total = await User.countDocuments(query);

        res.json({
            success: true,
            users,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            msg: 'Server error while fetching users'
        });
    }
});

// ✅ PATCH update user role
router.patch('/users/:userId/role', auth, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { role } = req.body;

        const allowedRoles = ['adopter', 'staff', 'vet', 'trainer', 'admin'];
        
        if (!role || !allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                msg: 'Valid role is required'
            });
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { role },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({
                success: false,
                msg: 'User not found'
            });
        }

        await logActivity({
            userId: req.user.id,
            role: 'admin',
            action: 'Updated User Role',
            target: userId,
            targetModel: 'User',
            details: `Changed ${user.name}'s role to ${role}`
        });

        res.json({
            success: true,
            message: `User role updated to ${role}`,
            user
        });

    } catch (error) {
        console.error('Update user role error:', error);
        res.status(500).json({
            success: false,
            msg: 'Server error while updating user role'
        });
    }
});

// ✅ DELETE user (soft delete)
router.delete('/users/:userId', auth, isAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                msg: 'User not found'
            });
        }

        if (userId === req.user.id) {
            return res.status(400).json({
                success: false,
                msg: 'Cannot delete your own account'
            });
        }

        // Soft delete
        user.status = 'inactive';
        user.email = `deleted_${Date.now()}_${user.email}`;
        await user.save();

        await logActivity({
            userId: req.user.id,
            role: 'admin',
            action: 'Deleted User',
            target: userId,
            targetModel: 'User',
            details: `Deleted user: ${user.name}`
        });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            msg: 'Server error while deleting user'
        });
    }
});

// ========================
// 🏢 ORGANIZATION MANAGEMENT
// ========================

// ✅ GET all organizations (moved from organizations.js)
router.get('/organizations', auth, isAdmin, async (req, res) => {
    try {
        const orgs = await Organization.find().select('name type contact');
        res.json({
            success: true,
            organizations: orgs
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            msg: 'Server error while fetching organizations'
        });
    }
});

// ✅ POST new organization (moved from organizations.js)
router.post('/organizations', auth, isAdmin, async (req, res) => {
    try {
        const { name, type, contact } = req.body;
        if (!name || !type) return res.status(400).json({ 
            success: false,
            msg: 'Name and type are required' 
        });

        const newOrg = new Organization({ name, type, contact });
        const org = await newOrg.save();

        await logActivity({
            userId: req.user.id,
            role: 'admin',
            action: 'Created Organization',
            target: org._id,
            targetModel: 'Organization',
            details: { name, type, contact }
        });

        res.json({
            success: true,
            organization: org
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({
            success: false,
            msg: 'Server error while creating organization'
        });
    }
});

// ========================
// 📋 ACTIVITY LOGS
// ========================

// ✅ GET all activity logs (moved from activityLog.js)
router.get('/activity-logs', auth, isAdmin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const logs = await ActivityLog.find()
            .populate('user', 'name email role')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const total = await ActivityLog.countDocuments();

        res.json({
            success: true,
            logs,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get activity logs error:', error);
        res.status(500).json({
            success: false,
            msg: 'Server error while fetching activity logs'
        });
    }
});

// ========================
// 🔧 SYSTEM MANAGEMENT
// ========================

// ✅ GET system health check
router.get('/system-health', auth, isAdmin, async (req, res) => {
    try {
        const healthChecks = {
            database: 'healthy',
            authentication: 'healthy'
        };

        // Check database connection
        try {
            await User.findOne();
            healthChecks.database = 'healthy';
        } catch (error) {
            healthChecks.database = 'unhealthy';
        }

        res.json({
            success: true,
            healthChecks,
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });

    } catch (error) {
        console.error('System health check error:', error);
        res.status(500).json({
            success: false,
            msg: 'Server error during health check'
        });
    }
});

module.exports = router;