const { logEvents } = require('../middleware/logEvents');

// Convert multipart array values to scalar (multer sends single values as arrays)
const toScalar = (value) => {
  if (Array.isArray(value)) return value[0];
  if (value === null || value === undefined) return '';
  return typeof value === 'string' ? value : String(value);
};

// Clean and normalize string values
const cleanString = (value) => {
  const scalar = toScalar(value);
  if (typeof scalar !== 'string') return '';
  const trimmed = scalar.trim();
  if (!trimmed || ['null', 'undefined'].includes(trimmed.toLowerCase())) return '';
  return trimmed;
};

// Validate HTTP/HTTPS URL format
const isValidHttpUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    logEvents(
      `[OPERATION] URL Validation Failed\n[ERROR TYPE] ${error.name}\n[ERROR MESSAGE] ${error.message}\n[VALIDATOR] bookValidator.isValidHttpUrl\n[INVALID URL] ${value}\n[EXPECTED FORMAT] http:// or https://\n[STACK TRACE]\n${error.stack}`,
      'errLog.log'
    );
    return false;
  }
};

// Normalize multipart form fields (convert arrays to scalars)
const normalizeMultipartFields = (req, _res, next) => {
  if (!req.body) {
    req.body = {};
    return next();
  }

  Object.keys(req.body).forEach((key) => {
    req.body[key] = toScalar(req.body[key]);
  });
  next();
};

// Validate required fields for book creation
const validateCreateBook = (req, res, next) => {
  const errors = [];
  const requiredFields = ['title', 'author', 'category'];

  // Validate required fields
  requiredFields.forEach((field) => {
    const value = cleanString(req.body[field]);
    if (!value) {
      const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
      errors.push({ field, message: `${fieldName} is required` });
    }
    req.body[field] = value;
  });

  // Validate optional imageUrl
  const imageUrl = cleanString(req.body.imageUrl);
  if (imageUrl) {
    if (!isValidHttpUrl(imageUrl)) {
      errors.push({ field: 'imageUrl', message: 'Image URL must be a valid URL' });
    } else {
      req.body.imageUrl = imageUrl;
    }
  } else {
    req.body.imageUrl = '';
  }

  if (errors.length) {
    logEvents(
      `[OPERATION] Validation Failed\n[ERRORS] ${JSON.stringify(errors)}\n[VALIDATOR] bookValidator.validateCreateBook`,
      'errLog.log'
    );
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  next();
};

// Validate optional fields for book update
const validateUpdateBook = (req, res, next) => {
  const errors = [];
  const updates = {};

  // Validate optional text fields
  ['title', 'author', 'category'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      const value = cleanString(req.body[field]);
      if (!value) {
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1);
        errors.push({ field, message: `${fieldName} cannot be empty if provided` });
      } else {
        updates[field] = value;
      }
    }
  });

  // Validate optional imageUrl
  if (Object.prototype.hasOwnProperty.call(req.body, 'imageUrl')) {
    const imageUrl = cleanString(req.body.imageUrl);
    if (!imageUrl) {
      updates.imageUrl = '';
    } else if (!isValidHttpUrl(imageUrl)) {
      errors.push({ field: 'imageUrl', message: 'Image URL must be a valid URL' });
    } else {
      updates.imageUrl = imageUrl;
    }
  }

  // Validate optional available boolean
  if (Object.prototype.hasOwnProperty.call(req.body, 'available')) {
    const value = toScalar(req.body.available).toString().toLowerCase();
    updates.available = ['true', '1', 'yes', 'on'].includes(value);
  }

  // Ensure at least one field is provided
  if (!req.file && Object.keys(updates).length === 0) {
    errors.push({ field: 'general', message: 'Provide at least one field to update' });
  }

  if (errors.length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  Object.assign(req.body, updates);
  next();
};

module.exports = {
  normalizeMultipartFields,
  validateCreateBook,
  validateUpdateBook,
};