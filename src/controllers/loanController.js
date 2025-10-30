const { logErrorDetails } = require('../middleware/logEvents');
const Loan = require('../models/Loan');
const Book = require('../models/Book');
const User = require('../models/User');
const { LATE_FEE_PER_DAY, BAN_MULTIPLIER, MAX_ACTIVE_LOANS, MS_PER_DAY } = require('../constants/loanConstants');

const borrowBook = async (req, res) => {
  try {
    const { bookId, dueDate } = req.body;

    const user = await User.findById(req.user.id);
    
    if (user.role === 'admin') {
      return res.status(403).json({ message: 'Admin users are not allowed to borrow books.' });
    }
    
    // Ban system: users with late returns are temporarily banned from borrowing
    if (user.banUntil && user.banUntil > new Date()) {
      const banDate = new Date(user.banUntil).toLocaleDateString('en-US');
      const remainingDays = Math.ceil((new Date(user.banUntil) - new Date()) / MS_PER_DAY);
      return res.status(403).json({ 
        message: `Your account is banned until ${banDate}. You can borrow books again in ${remainingDays} days.`,
        banUntil: user.banUntil,
        remainingDays
      });
    }

    // Check active loan limit
    const activeLoansCount = await Loan.countDocuments({
      user: req.user.id,
      isReturned: false
    });

    if (activeLoansCount >= MAX_ACTIVE_LOANS) {
      return res.status(403).json({ 
        message: `You can only borrow ${MAX_ACTIVE_LOANS} book at a time. Please return your current book before borrowing another.`,
        activeLoans: activeLoansCount,
        maxLimit: MAX_ACTIVE_LOANS
      });
    }

    const unpaidLoans = await Loan.find({
      user: req.user.id,
      lateFee: { $gt: 0 }
    });

    if (unpaidLoans.length > 0) {
      const totalDebt = unpaidLoans.reduce((sum, loan) => sum + (loan.lateFee || 0), 0);
      return res.status(403).json({ 
        message: `You have an unpaid late fee of ${totalDebt} TL. Please pay your debt before borrowing another book.`,
        totalDebt: totalDebt,
        unpaidLoansCount: unpaidLoans.length
      });
    }

    const book = await Book.findById(bookId);
    if (!book || !book.available) {
      return res.status(400).json({ message: 'Book is not available.' });
    }

    if (!dueDate) {
      return res.status(400).json({ message: 'You must specify a due date for returning the book.' });
    }
    const dueDateObj = new Date(dueDate);
    if (isNaN(dueDateObj.getTime()) || dueDateObj <= new Date()) {
      return res.status(400).json({ message: 'Due date must be a valid future date.' });
    }

    const loan = new Loan({
      user: req.user.id,
      book: bookId,
      dueDate: dueDateObj,
    });
    book.available = false;
    await book.save();
    await loan.save();

    res.status(201).json(loan);
  } catch (error) {
    await logErrorDetails('Borrow Book Failed', error, req, {
      bookId: req.body?.bookId || 'N/A',
      dueDate: req.body?.dueDate || 'N/A'
    });
    res.status(500).json({ message: 'An error occurred while borrowing the book.' });
  }
};

const getUserLoans = async (req, res) => {
  try {
    const loans = await Loan.find({ user: req.user.id }).populate('book');
    res.status(200).json(loans);
  } catch (error) {
    await logErrorDetails('Get User Loans Failed', error, req, {});
    res.status(500).json({ message: 'An error occurred while listing borrowed books.' });
  }
};

const returnBook = async (req, res) => {
  try {
    const { loanId } = req.params;
    const loan = await Loan.findById(loanId).populate('book user');
    if (!loan || loan.isReturned) {
      return res.status(400).json({ message: 'Invalid borrowing transaction.' });
    }
    if (loan.user.role === 'admin') {
      return res.status(403).json({ message: 'Admins are not allowed to return books.' });
    }

    const returnDate = new Date();
    let lateDays = 0;
    let lateFee = 0;
    
    // Calculate late fee
    if (loan.dueDate && returnDate > loan.dueDate) {
      lateDays = Math.ceil((returnDate - loan.dueDate) / MS_PER_DAY);
      lateFee = lateDays * LATE_FEE_PER_DAY;
    }

    // Automatic ban system
    if (lateDays > 0) {
      const user = await User.findById(loan.user._id);
      let extraDays = lateDays * BAN_MULTIPLIER;
      if (user.banUntil && user.banUntil > new Date()) {
        const currentBan = user.banUntil;
        user.banUntil = new Date(currentBan.getTime() + extraDays * MS_PER_DAY);
      } else {
        user.banUntil = new Date(returnDate.getTime() + extraDays * MS_PER_DAY);
      }
      await user.save();
    }

    loan.isReturned = true;
    loan.returnDate = returnDate;
    loan.daysLate = lateDays;
    loan.lateFee = lateFee;
    
    if (loan.book) {
      loan.book.available = true;
      await loan.book.save();
    }
    
    await loan.save();

    const responseMessage = lateFee > 0 
      ? `Book successfully returned. Late fee: ${lateFee} TL (${lateDays} days late)`
      : 'Book successfully returned on time.';

    res.status(200).json({ 
      message: responseMessage,
      lateFee,
      daysLate: lateDays,
      loan 
    });
  } catch (error) {
    await logErrorDetails('Return Book Failed', error, req, {
      loanId: req.params?.loanId || 'N/A'
    });
    res.status(500).json({ message: 'An error occurred while returning the book.', error: error.message });
  }
};

const getAllLoansAdmin = async (req, res) => {
  try {
    const { status, overdue } = req.query;
    
    let query = {};
    
    if (overdue === 'true') {
      query.isReturned = false;
      query.dueDate = { $lt: new Date() };
    }
    
    if (status === 'active') {
      query.isReturned = false;
    } else if (status === 'returned') {
      query.isReturned = true;
    }
    
    const loans = await Loan.find(query)
      .populate('user', 'username email')
      .populate('book', 'title author imageUrl')
      .sort({ loanDate: -1 });
    
    const loansWithDaysLate = loans.map(loan => {
      const loanObj = loan.toObject();
      
      // Calculate current late days for active (unreturned) loans dynamically
      if (!loanObj.isReturned) {
        const dueDate = new Date(loanObj.dueDate);
        const today = new Date();
        const diffTime = today - dueDate;
        const diffDays = Math.ceil(diffTime / MS_PER_DAY);
        loanObj.daysLate = diffDays > 0 ? diffDays : 0;
      } else {
        loanObj.daysLate = loanObj.daysLate || 0;
      }
      
      return loanObj;
    });
    
    res.status(200).json(loansWithDaysLate);
  } catch (error) {
    await logErrorDetails('Get All Loans Admin Failed', error, req, {
      status: req.query?.status || 'all',
      overdue: req.query?.overdue || 'false'
    });
    res.status(500).json({ message: 'An error occurred while loading loans.' });
  }
};

const getLateFeeStats = async (req, res) => {
  try {
    const totalLateFees = await Loan.aggregate([
      { $match: { lateFee: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$lateFee' } } }
    ]);
    
    const overdueCount = await Loan.countDocuments({
      isReturned: false,
      dueDate: { $lt: new Date() }
    });
    const topUsers = await Loan.aggregate([
      { $match: { lateFee: { $gt: 0 } } },
      { $group: { _id: '$user', totalLateFee: { $sum: '$lateFee' }, lateCount: { $sum: 1 } } },
      { $sort: { totalLateFee: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          userId: '$_id',
          username: '$userInfo.username',
          email: '$userInfo.email',
          totalLateFee: 1,
          lateCount: 1
        }
      }
    ]);
    
    res.status(200).json({
      totalLateFees: totalLateFees[0]?.total || 0,
      overdueCount,
      topUsers
    });
  } catch (error) {
    await logErrorDetails('Get Late Fee Stats Failed', error, req, {});
    res.status(500).json({ message: 'An error occurred while loading statistics.' });
  }
};

const waiveLateFee = async (req, res) => {
  try {
    const { loanId } = req.params;
    
    const loan = await Loan.findById(loanId);
    if (!loan) {
      return res.status(404).json({ message: 'Loan record not found.' });
    }
    
    loan.lateFee = 0;
    loan.daysLate = 0;
    await loan.save();
    
    res.status(200).json({ message: 'Late fee has been waived.', loan });
  } catch (error) {
    await logErrorDetails('Waive Late Fee Failed', error, req, {
      loanId: req.params?.loanId || 'N/A'
    });
    res.status(500).json({ message: 'An error occurred while waiving the fee.' });
  }
};

const getUserLateFeeHistory = async (req, res) => {
  try {
    const loans = await Loan.find({ 
      user: req.user.id,
      lateFee: { $gt: 0 }
    })
      .populate('book', 'title author imageUrl')
      .sort({ returnDate: -1 });
    
    const totalLateFees = loans.reduce((sum, loan) => sum + (loan.lateFee || 0), 0);
    
    res.status(200).json({
      loans,
      totalLateFees,
      count: loans.length
    });
  } catch (error) {
    await logErrorDetails('Get User Late Fee History Failed', error, req, {});
    res.status(500).json({ message: 'An error occurred while loading late fee history.' });
  }
};

module.exports = {
  borrowBook,
  getUserLoans,
  returnBook,
  getAllLoansAdmin,
  getLateFeeStats,
  waiveLateFee,
  getUserLateFeeHistory,
};