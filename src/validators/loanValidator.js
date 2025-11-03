const { body } = require('express-validator');

const borrowBookValidationRules = [
  body('bookId')
    .trim()
    .notEmpty()
    .withMessage('Book ID is required')
    .isMongoId()
    .withMessage('Invalid book ID format'),
  
  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .toDate()
    .withMessage('Due date must be a valid date')
    .custom((value) => {
      const dueDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate <= today) {
        throw new Error('Due date must be in the future');
      }
      return true;
    })
];

module.exports = { borrowBookValidationRules };