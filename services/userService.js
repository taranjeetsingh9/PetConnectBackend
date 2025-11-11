const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const logActivity = require('../utils/logActivity');
const { cloudinary } = require('../config/cloudinary');


exports.getUserById = async (userId) => {
  try {
    const user = await User.findById(userId).select("-password");
    if (!user) {
      throw { status: 404, message: "User not found" };
    }
    return user;
  } catch (error) {
    throw { status: 500, message: "Server error fetching user" };
  }
};

exports.updateProfile = async (userId, profileData) => {
  try {
    const { name, location, role, lifestyle } = profileData;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        name, 
        location, 
        role, 
        lifestyle,
        lastLogin: new Date()
      },
      { new: true }
    ).select("-password");

    if (!user) throw { status: 404, message: "User not found" };

    await logActivity({
      userId: userId,
      role: user.role,
      action: 'Updated Profile',
      target: userId,
      targetModel: 'User',
      details: `Updated profile information`
    });

    return user;
  } catch (error) {
    throw { status: 500, message: "Server error updating profile" };
  }
};

exports.getUserProfile = async (userId) => {
  try {
    const user = await User.findById(userId)
      .select("-password")
      .populate('favoritedPets', 'name breed images status')
      .populate('adoptedPets', 'name breed status')
      .populate('fosteredPets', 'name breed status')
      .populate('organization', 'name type');
      
    if (!user) throw { status: 404, message: "User not found" };
    return user;
  } catch (error) {
    throw { status: 500, message: "Server error fetching user profile" };
  }
};

exports.getUserStats = async (userId) => {
  try {
    const user = await User.findById(userId)
      .select('favoritedPets adoptedPets fosteredPets createdAt')
      .populate('favoritedPets', 'name status')
      .populate('adoptedPets', 'name status')
      .populate('fosteredPets', 'name status');

    if (!user) throw { status: 404, message: "User not found" };

    return {
      favoriteCount: user.favoritedPets ? user.favoritedPets.length : 0,
      adoptedCount: user.adoptedPets ? user.adoptedPets.length : 0,
      fosteredCount: user.fosteredPets ? user.fosteredPets.length : 0,
      memberSince: user.createdAt
    };
  } catch (error) {
    throw { status: 500, message: "Server error fetching user stats" };
  }
};

exports.getUserActivityLogs = async (userId) => {
  try {
    const logs = await ActivityLog.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(20);
    return logs;
  } catch (error) {
    throw { status: 500, message: "Server error fetching activity logs" };
  }
};

exports.addFavorite = async (userId, petId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw { status: 404, message: "User not found" };

    if (!user.favoritedPets.includes(petId)) {
      user.favoritedPets.push(petId);
      await user.save();
    }

    await logActivity({
      userId: userId,
      role: user.role,
      action: 'Added Favorite',
      target: petId,
      targetModel: 'Pet',
      details: 'Added pet to favorites'
    });

    return {
      success: true,
      message: 'Pet added to favorites',
      favoriteCount: user.favoritedPets.length
    };
  } catch (error) {
    throw { status: 500, message: "Server error adding favorite" };
  }
};

exports.removeFavorite = async (userId, petId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw { status: 404, message: "User not found" };

    user.favoritedPets = user.favoritedPets.filter(
      id => id.toString() !== petId
    );
    await user.save();

    await logActivity({
      userId: userId,
      role: user.role,
      action: 'Removed Favorite',
      target: petId,
      targetModel: 'Pet',
      details: 'Removed pet from favorites'
    });

    return {
      success: true,
      message: 'Pet removed from favorites',
      favoriteCount: user.favoritedPets.length
    };
  } catch (error) {
    throw { status: 500, message: "Server error removing favorite" };
  }
};

exports.uploadAvatar = async (userId, avatarData, file) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarData },
      { new: true }
    ).select('-password');

    if (!updatedUser) throw { status: 404, message: "User not found" };

    await logActivity({
      userId: userId,
      role: updatedUser.role,
      action: 'Uploaded Avatar',
      target: userId,
      targetModel: 'User',
      details: 'Uploaded profile picture'
    });

    return {
      success: true,
      message: 'Avatar uploaded successfully!',
      avatarUrl: avatarData.url,
      user: updatedUser
    };
  } catch (error) {
    // Clean up uploaded file if user update fails
    if (file) {
      await cloudinary.uploader.destroy(file.filename);
    }
    throw { status: 500, message: "Server error during avatar upload" };
  }
};

exports.getUsersByRole = async (role) => {
  try {
    const users = await User.find({ role }).select('_id name email');
    return users;
  } catch (error) {
    throw { status: 500, message: "Server error fetching users by role" };
  }
};
