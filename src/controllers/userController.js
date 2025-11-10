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

    // Cascade delete: Clean up all related data
    const Loan = require('../models/Loan');
    const Review = require('../models/Review');
    const Favorite = require('../models/Favorite');
    const Book = require('../models/Book');

    // 1. Get all active (not returned) loans for this user
    const activeLoans = await Loan.find({ user: id, isReturned: false });
    
    // 2. Mark books from active loans as available again
    for (const loan of activeLoans) {
      if (loan.book) {
        await Book.findByIdAndUpdate(loan.book, { available: true });
      }
    }

    // 3. Delete all loans (both active and completed) for this user
    await Loan.deleteMany({ user: id });

    // 4. Delete all reviews by this user
    await Review.deleteMany({ user: id });

    // 5. Delete all favorites for this user
    await Favorite.deleteMany({ userId: id });

    // 6. Finally, delete the user
    await user.deleteOne();

    res.status(200).json({ message: 'User successfully deleted.' });
  } catch (error) {
    await logErrorDetails('Delete User Failed', error, req, {
      targetUserId: req.params?.id || 'N/A'
    });
    res.status(500).json({ message: 'An error occurred while deleting the user.' });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    await logErrorDetails('Get All Users Failed', error, req, {});
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

    // Handle permanent ban
    if (updates.isPermanentBan) {
      updates.banUntil = null; // Clear any temporary ban date
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