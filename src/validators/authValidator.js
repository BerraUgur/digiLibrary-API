const { body } = require('express-validator');

const registerValidationRules = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters'),
  
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('tcIdentity')
    .trim()
    .notEmpty()
    .withMessage('TC Identity Number is required')
    .isLength({ min: 11, max: 11 })
    .withMessage('TC Identity Number must be 11 digits')
    .isNumeric()
    .withMessage('TC Identity Number must contain only numbers'),
  
  body('phoneNumber')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+90 \d{3} \d{3} \d{2} \d{2}$/)
    .withMessage('Phone number must be in format: +90 XXX XXX XX XX'),
  
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ min: 10 })
    .withMessage('Address must be at least 10 characters'),
  
  body('birthDate')
    .notEmpty()
    .withMessage('Birth date is required')
    .isISO8601()
    .withMessage('Birth date must be a valid date')
];

const loginValidationRules = [
  body('email')
    .trim()
    .normalizeEmail()
    .isEmail()
    .withMessage('Valid email is required'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

module.exports = { registerValidationRules, loginValidationRules };