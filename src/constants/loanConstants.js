module.exports = {
  LOAN_DURATION_DAYS: 14,           // Book loan duration in days
  LATE_FEE_PER_DAY: 5,              // Daily late return fee in TL
  BAN_MULTIPLIER: 2,                // Ban duration multiplier (late days × 2)
  MAX_ACTIVE_LOANS: 1,              // Maximum number of books that can be borrowed at once
  REMINDER_DAY: 13,                 // Day to send reminder email (day 13 of 14-day loan = tomorrow is the last day)
  MS_PER_DAY: 24 * 60 * 60 * 1000,  // Milliseconds in one day (used for date calculations)
};
