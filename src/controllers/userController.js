const { logErrorDetails } = require('../middleware/logEvents');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    await logErrorDetails('Get User Profile Failed', error, req, {});
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Get User Profile Error:', error);
    }
    res.status(500).json({ message: 'Server error.' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    await logErrorDetails('Update User Profile Failed', error, req, {
      updatedFields: Object.keys(req.body || {}).join(', ')
    });
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Update User Profile Error:', error);
    }
    res.status(500).json({ message: 'Server error.' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ message: 'Password successfully updated.' });
  } catch (error) {
    await logErrorDetails('Update Password Failed', error, req, {});
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Update Password Error:', error);
    }
    res.status(500).json({ message: 'Server error.' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    await user.deleteOne();
    res.status(200).json({ message: 'User successfully deleted.' });
  } catch (error) {
    await logErrorDetails('Delete User Failed', error, req, {
      targetUserId: req.params?.id || 'N/A'
    });
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Delete User Error:', error);
    }
    res.status(500).json({ message: 'An error occurred while deleting the user.' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    await logErrorDetails('Get All Users Failed', error, req, {});
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Get All Users Error:', error);
    }
    res.status(500).json({ message: 'An error occurred while fetching users.' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.password) {
      delete updates.password;
    }

    const user = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json(user);
  } catch (error) {
    await logErrorDetails('Update User Failed', error, req, {
      targetUserId: req.params?.id || 'N/A',
      updatedFields: Object.keys(req.body || {}).join(', ')
    });
    if (process.env.NODE_ENV !== 'production') {
      console.error('🔴 Update User Error:', error);
    }
    res.status(500).json({ message: 'An error occurred while updating user.' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  updatePassword,
  deleteUser,
  getAllUsers,
  updateUser,
};