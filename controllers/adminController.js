const adminService = require('../services/adminService');

exports.getAnalytics = async (req, res) => {
    try {
        const analytics = await adminService.getAnalytics();
        res.json({ success: true, analytics });
    } catch (err) {
        console.error('Get analytics error:', err);
        res.status(500).json({ success: false, msg: 'Server error while fetching analytics' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const result = await adminService.getAllUsers(req.query);
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('Get users error:', err);
        res.status(err.status || 500).json({ success: false, msg: err.message || 'Server error' });
    }
};

exports.updateUserRole = async (req, res) => {
    try {
        const user = await adminService.updateUserRole(req.params.userId, req.body.role, req.user.id);
        res.json({ success: true, message: `User role updated to ${user.role}`, user });
    } catch (err) {
        console.error('Update user role error:', err);
        res.status(err.status || 500).json({ success: false, msg: err.message || 'Server error' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await adminService.deleteUser(req.params.userId, req.user.id);
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(err.status || 500).json({ success: false, msg: err.message || 'Server error' });
    }
};

exports.getOrganizations = async (req, res) => {
    try {
        const orgs = await adminService.getAllOrganizations();
        res.json({ success: true, organizations: orgs });
    } catch (err) {
        console.error('Get organizations error:', err);
        res.status(500).json({ success: false, msg: 'Server error while fetching organizations' });
    }
};

exports.createOrganization = async (req, res) => {
    try {
        const org = await adminService.createOrganization(req.body, req.user.id);
        res.json({ success: true, organization: org });
    } catch (err) {
        console.error('Create organization error:', err);
        res.status(err.status || 500).json({ success: false, msg: err.message || 'Server error' });
    }
};

exports.getActivityLogs = async (req, res) => {
    try {
        const logs = await adminService.getActivityLogs(req.query);
        res.json({ success: true, ...logs });
    } catch (err) {
        console.error('Get activity logs error:', err);
        res.status(500).json({ success: false, msg: 'Server error while fetching activity logs' });
    }
};

exports.getSystemHealth = async (req, res) => {
    try {
        const health = await adminService.getSystemHealth();
        res.json({ success: true, ...health });
    } catch (err) {
        console.error('System health check error:', err);
        res.status(500).json({ success: false, msg: 'Server error during health check' });
    }
};
