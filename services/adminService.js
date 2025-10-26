// services/adminService.js
const User = require('../models/User');
const Pet = require('../models/Pet');
const AdoptionRequest = require('../models/AdopterRequest');
const Organization = require('../models/Organization');
const ActivityLog = require('../models/ActivityLog');
const logActivity = require('../utils/logActivity');

const createError = (msg, status = 400) => {
    const err = new Error(msg);
    err.status = status;
    return err;
};

class AdminService {
    // ANALYTICS
    async getAnalytics() {
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

        const userDistribution = await User.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        const petDistribution = await Pet.aggregate([
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        return {
            overview: { totalUsers, totalPets, totalAdoptionRequests, totalOrganizations, recentAdoptions },
            userDistribution,
            petDistribution
        };
    }

    // USERS
    async getAllUsers({ page = 1, limit = 20, role, search }) {
        const query = {};
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

        return { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    async updateUserRole(userId, role, adminId) {
        const allowedRoles = ['adopter', 'staff', 'vet', 'trainer', 'admin'];
        if (!role || !allowedRoles.includes(role)) throw createError('Valid role is required');

        const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
        if (!user) throw createError('User not found', 404);

        await logActivity({
            userId: adminId,
            role: 'admin',
            action: 'Updated User Role',
            target: userId,
            targetModel: 'User',
            details: `Changed ${user.name}'s role to ${role}`
        });

        return user;
    }

    async deleteUser(userId, adminId) {
        if (userId === adminId) throw createError('Cannot delete your own account');

        const user = await User.findById(userId);
        if (!user) throw createError('User not found', 404);

        user.status = 'inactive';
        user.email = `deleted_${Date.now()}_${user.email}`;
        await user.save();

        await logActivity({
            userId: adminId,
            role: 'admin',
            action: 'Deleted User',
            target: userId,
            targetModel: 'User',
            details: `Deleted user: ${user.name}`
        });

        return user;
    }

    // ORGANIZATIONS
    async getAllOrganizations() {
        return Organization.find().select('name type contact');
    }

    async createOrganization({ name, type, contact }, adminId) {
        if (!name || !type) throw createError('Name and type are required');

        const org = new Organization({ name, type, contact });
        await org.save();

        await logActivity({
            userId: adminId,
            role: 'admin',
            action: 'Created Organization',
            target: org._id,
            targetModel: 'Organization',
            details: { name, type, contact }
        });

        return org;
    }

    // ACTIVITY LOGS
    async getActivityLogs({ page = 1, limit = 50 }) {
        const logs = await ActivityLog.find()
            .populate('user', 'name email role')
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip((page - 1) * limit);

        const total = await ActivityLog.countDocuments();
        return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
    }

    // SYSTEM HEALTH
    async getSystemHealth() {
        let database = 'healthy';
        try { await User.findOne(); } catch { database = 'unhealthy'; }

        return {
            healthChecks: { database, authentication: 'healthy' },
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        };
    }
}

// Singleton instance for backward compatibility
const adminService = new AdminService();

module.exports = {
    AdminService,
    adminService,

    // Legacy bindings for production
    getAnalytics: adminService.getAnalytics.bind(adminService),
    getAllUsers: adminService.getAllUsers.bind(adminService),
    updateUserRole: adminService.updateUserRole.bind(adminService),
    deleteUser: adminService.deleteUser.bind(adminService),
    getAllOrganizations: adminService.getAllOrganizations.bind(adminService),
    createOrganization: adminService.createOrganization.bind(adminService),
    getActivityLogs: adminService.getActivityLogs.bind(adminService),
    getSystemHealth: adminService.getSystemHealth.bind(adminService)
};
