const cron = require('node-cron');
const { logEvents } = require('../middleware/logEvents');
const Loan = require('../models/Loan');
const { sendReminderEmail } = require('./mailService');
const { MS_PER_DAY } = require('../constants/loanConstants');

// Start daily cron job to send reminder emails (09:00 daily)
const startReminderCron = () => {
  cron.schedule('0 9 * * *', async () => {
    try {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      // Find loans due tomorrow that haven't received reminder yet
      const loansNeedingReminder = await Loan.find({
        isReturned: false,
        reminderSent: false,
        dueDate: {
          $gte: tomorrow.setHours(0, 0, 0, 0),
          $lte: tomorrow.setHours(23, 59, 59, 999)
        }
      })
      .populate('user book bookOwner');
      
      for (const loan of loansNeedingReminder) {
        try {
          const { user, book, dueDate } = loan;
          
          if (!user || !user.email) {
            continue;
          }
          
          const subject = '📚 Book Return Reminder - Due Tomorrow!';
          const text = `
Hello ${user.username},

Your borrowed book "${book.title}" is due TOMORROW!

Due Date: ${dueDate.toLocaleDateString('en-US')}

Please remember to return the book on time. Late returns incur a daily fee of 5 TL.

DigiLibrary Team
          `.trim();
          
          await sendReminderEmail(user.email, subject, text);
          
          // Mark reminder as sent
          loan.reminderSent = true;
          await loan.save();
          
        } catch (emailError) {
          await logEvents(
            `[OPERATION] Reminder Email Failed\n[ERROR] ${emailError.message}\n[RECIPIENT] ${loan.user?.email}\n[BOOK] ${book?.title}\n[STACK]\n${emailError.stack}`,
            'errLog.log'
          );
        }
      }
      
    } catch (error) {
      await logEvents(
        `[OPERATION] Reminder Cron Job Failed\n[ERROR] ${error.message}\n[TIME] ${new Date().toISOString()}\n[STACK]\n${error.stack}`,
        'errLog.log'
      );
    }
  });
};

// Start daily cron job to calculate late fees (00:01 daily)
const startLateFeeCalculation = () => {
  const { LATE_FEE_PER_DAY } = require('../constants/loanConstants');
  
  cron.schedule('1 0 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Find all unreturned loans past their due date
      const overdueLoans = await Loan.find({
        isReturned: false,
        dueDate: { $lt: today }
      }).populate('user book bookOwner');
      
      for (const loan of overdueLoans) {
        const daysLate = Math.ceil((today - loan.dueDate) / MS_PER_DAY);
        const lateFee = daysLate * LATE_FEE_PER_DAY;
        
        // Update late fee information
        loan.daysLate = daysLate;
        loan.lateFee = lateFee;
        await loan.save();
      }
      
    } catch (error) {
      await logEvents(
        `[OPERATION] Late Fee Calculation Failed\n[ERROR] ${error.message}\n[TIME] ${new Date().toISOString()}\n[STACK]\n${error.stack}`,
        'errLog.log'
      );
    }
  });
};

module.exports = {
  startReminderCron,
  startLateFeeCalculation,
};
