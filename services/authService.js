const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.signup = async (email, password) => {
  try {
    let user = await User.findOne({ email });  
    if (user) {
      throw { status: 400, message: 'User already exists' };
    }

    const salt = await bcrypt.genSalt(15);
    const hashedPassword = await bcrypt.hash(password, salt);

    user = await User.create({ email, password: hashedPassword });
    
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    return { token, firstTime: true };
  } catch (error) {
    throw { status: 500, message: 'Server Error during signup' };
  }
};

exports.login = async (email, password) => {
  try {
    const user = await User.findOne({ email });
    if (!user) {
      throw { status: 400, message: 'Invalid credentials' };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw { status: 400, message: 'Invalid credentials' };
    }

    const payload = { 
      user: { 
        id: user.id,  
        role: user.role 
      } 
    };
    
    // Only include organization if it exists (for staff/admin)
    if (user.organization) {
      payload.user.organization = user.organization;
    }
    
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
    const firstTime = !user.name || !user.location; // check if profile setup needed
    
    return { token, firstTime };
  } catch (error) {
    throw { status: 500, message: 'Server Error during login' };
  }
};