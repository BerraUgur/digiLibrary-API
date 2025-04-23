const Loan = require('../models/Loan');
const Book = require('../models/Book');
const User = require('../models/User'); // Added User model
const { sendReminderEmail } = require('../config/mailService');

// Borrowing a book
const borrowBook = async (req, res) => {
  try {
    const { bookId, dueDate } = req.body;

    // Check if the user is allowed to borrow books
    const user = await User.findById(req.user.id);
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admins are not allowed to borrow books.' });
    }
    if (user.banUntil && user.banUntil > new Date()) {
      return res.status(403).json({ message: `You cannot borrow books until ${user.banUntil.toLocaleDateString()}.` });
    }

    // Check if the book is available
    const book = await Book.findById(bookId);
    if (!book || !book.available) {
      return res.status(400).json({ message: 'Book is not available.' });
    }

    // Validate due date
    if (!dueDate) {
      return res.status(400).json({ message: 'You must specify a due date for returning the book.' });
    }
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime()) || dueDateObj <= new Date()) {
      return res.status(400).json({ message: 'Due date must be a valid future date.' });
    }

    // Create the borrowing transaction
    const loan = new Loan({
      user: req.user.id,
      book: bookId,
      dueDate: dueDateObj,
    });

    // Update and save the book status
    book.available = false;
    await book.save();
    await loan.save();

    res.status(201).json(loan);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while borrowing the book.' });
  }
};

// Listing books borrowed by the user
const getUserLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user.id }).populate('book');
    res.status(200).json(loans);
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while listing borrowed books.' });
  }
};

// Returning a book
const returnBook = async (req, res) => {
  try {
    const { loanId } = req.params;

    // Check the borrowing transaction
    const loan = await Loan.findById(loanId).populate('book user');
    if (!loan || loan.isReturned) {
      return res.status(400).json({ message: 'Invalid borrowing transaction.' });
    }
    if (loan.user.role === 'admin') {
      return res.status(403).json({ message: 'Admins are not allowed to return books.' });
    }

    // Check for late return
    const returnDate = new Date();
    let lateDays = 0;
    if (loan.dueDate && returnDate > loan.dueDate) {
      lateDays = Math.ceil((returnDate - loan.dueDate) / (1000 * 60 * 60 * 24));
    }

    // Apply penalty for late return
    if (lateDays > 0) {
      const user = await User.findById(loan.user._id);
      let extraDays = lateDays * 2;
      if (user.banUntil && user.banUntil > new Date()) {
        const currentBan = user.banUntil;
        user.banUntil = new Date(currentBan.getTime() + extraDays * 24 * 60 * 60 * 1000);
      } else {
        user.banUntil = new Date(returnDate.getTime() + extraDays * 24 * 60 * 60 * 1000);
      }
      await user.save();
    }

    // Update and save the borrowing status
    loan.isReturned = true;
    loan.returnDate = returnDate;
    loan.book.available = true;

    await loan.book.save();
    await loan.save();

    res.status(200).json({ message: 'Book successfully returned.' });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while returning the book.' });
  }
};

// Function to send reminder emails for overdue loans
const sendLoanReminders = async () => {
  try {
    const today = new Date();

    // Find loans where the return date is overdue
    const overdueLoans = await Loan.find({ returnDate: { $lt: today } }).populate('userId bookId');

    for (const loan of overdueLoans) {
      const { userId, bookId, returnDate } = loan;
      const email = userId.email; // Assuming user model has an email field
      const subject = 'Book Return Reminder';
      const text = `Dear ${userId.username},\n\nThis is a reminder to return the book "${bookId.title}" which was due on ${returnDate.toDateString()}. Please return it as soon as possible to avoid penalties.\n\nThank you.`;

      await sendReminderEmail(email, subject, text);
    }

    console.log('Reminder emails sent successfully.');
  } catch (error) {
    console.error('Error sending loan reminders:', error);
  }
};

module.exports = {
  borrowBook,
  getUserLoans,
  returnBook,
  sendLoanReminders,
};