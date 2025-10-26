const authService = require('../services/authService');
const userService = require('../services/userService');

exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.signup(email, password);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ msg: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ msg: error.message });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await userService.getUserById(req.user.id);
    res.json(user);
  } catch (error) {
    res.status(error.status || 500).json({ msg: error.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { name, location, role, lifestyle } = req.body;
    const user = await userService.updateProfile(req.user.id, {
      name,
      location,
      role,
      lifestyle
    });
    res.json(user);
  } catch (error) {
    res.status(error.status || 500).json({ msg: error.message });
  }
};