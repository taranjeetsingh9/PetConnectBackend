const User = require('../models/User');
const Pet = require('../models/Pet');
const AdoptionRequest = require('../models/AdopterRequest');
const Organization = require('../models/Organization');
const ActivityLog = require('../models/ActivityLog');
const logActivity = require('../utils/logActivity');

exports.getAnalytics = async () => {
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
};

exports.getAllUsers = async ({ page = 1, limit = 20, role, search }) => {
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
};

exports.updateUserRole = async (userId, role, adminId) => {
    const allowedRoles = ['adopter', 'staff', 'vet', 'trainer', 'admin'];
    if (!role || !allowedRoles.includes(role)) throw { status: 400, message: 'Valid role is required' };

    const user = await User.findByIdAndUpdate(userId, { role }, { new: true }).select('-password');
    if (!user) throw { status: 404, message: 'User not found' };

    await logActivity({
        userId: adminId,
        role: 'admin',
        action: 'Updated User Role',
        target: userId,
        targetModel: 'User',
        details: `Changed ${user.name}'s role to ${role}`
    });

    return user;
};

exports.deleteUser = async (userId, adminId) => {
    const user = await User.findById(userId);
    if (!user) throw { status: 404, message: 'User not found' };
    if (userId === adminId) throw { status: 400, message: 'Cannot delete your own account' };

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
};

exports.getAllOrganizations = async () => {
    return await Organization.find().select('name type contact');
};

exports.createOrganization = async ({ name, type, contact }, adminId) => {
    if (!name || !type) throw { status: 400, message: 'Name and type are required' };

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
};

exports.getActivityLogs = async ({ page = 1, limit = 50 }) => {
    const logs = await ActivityLog.find()
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);

    const total = await ActivityLog.countDocuments();
    return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

exports.getSystemHealth = async () => {
    let database = 'healthy';
    try { await User.findOne(); } catch { database = 'unhealthy'; }

    return {
        healthChecks: { database, authentication: 'healthy' },
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    };
};
