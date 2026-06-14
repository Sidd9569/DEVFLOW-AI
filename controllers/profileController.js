const User = require('../models/User');
const Activity = require('../models/Activity');
const bcrypt = require('bcrypt');
const logger = require('../utils/logger');

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('products', 'name description status');

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        products: user.products,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    logger.error(`Get profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching profile'
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, avatar } = req.body;

    const user = await User.findById(req.userId);
    
    const previousValue = {
      firstName: user.firstName,
      lastName: user.lastName
    };

    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.avatar = avatar !== undefined ? avatar : user.avatar;

    await user.save();

    await Activity.create({
      user: req.userId,
      action: 'update',
      entityType: 'user',
      entityId: user._id,
      entityName: `${user.firstName} ${user.lastName}`,
      previousValue,
      newValue: { firstName, lastName, avatar },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (error) {
    logger.error(`Update profile error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.userId).select('+password');

    const isPasswordCorrect = await user.comparePassword(currentPassword);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    await Activity.create({
      user: req.userId,
      action: 'update',
      entityType: 'user',
      entityId: user._id,
      entityName: `${user.firstName} ${user.lastName}`,
      metadata: { action: 'password-changed' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error(`Change password error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
};

const getActivityLog = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const activities = await Activity.find({ user: req.userId })
      .populate('product', 'name')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Activity.countDocuments({ user: req.userId });

    res.status(200).json({
      success: true,
      activities,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count
    });
  } catch (error) {
    logger.error(`Get activity log error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error fetching activity log'
    });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;

    const user = await User.findById(req.userId).select('+password');

    const isPasswordCorrect = await user.comparePassword(password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }

    await Activity.create({
      user: req.userId,
      action: 'delete',
      entityType: 'user',
      entityId: user._id,
      entityName: `${user.firstName} ${user.lastName}`,
      metadata: { action: 'account-deleted' },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await User.findByIdAndDelete(req.userId);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete account error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Server error deleting account'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getActivityLog,
  deleteAccount
};