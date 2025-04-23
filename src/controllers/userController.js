const User = require('../models/User');
const bcrypt = require('bcrypt');

// Viewing user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error.' });
  }
};

// Updating user profile
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
    res.status(500).json({ message: 'Server error.' });
  }
};

// Updating password
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
    res.status(500).json({ message: 'Server error.' });
  }
};

// Kullanıcı silme (sadece admin)
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
    res.status(500).json({ message: 'An error occurred while deleting the user.' });
  }
};

// Kullanıcıları listeleme
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password'); // Şifre hariç tüm kullanıcı bilgilerini getir
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Kullanıcılar alınırken bir hata oluştu.' });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  updatePassword,
  deleteUser,
  getAllUsers,
};