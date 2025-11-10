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

// Normalize multipart form fields but preserve arrays for author and category
const normalizeMultipartFields = (req, _res, next) => {
  if (!req.body) {
    req.body = {};
    return next();
  }

  Object.keys(req.body).forEach((key) => {
    // Keep author and category as arrays (multer correctly parses multiple values)
    if (key === 'author' || key === 'category') {
      // If it's already an array, keep it; if single value, convert to array
      if (!Array.isArray(req.body[key])) {
        req.body[key] = [req.body[key]];
      }
    } else {
      // Convert other fields to scalar
      req.body[key] = toScalar(req.body[key]);
    }
  });
  next();
};

// Validate required fields for book creation
const validateCreateBook = (req, res, next) => {
  const errors = [];

  // Validate Turkish title (required)
  const title_tr = cleanString(req.body.title_tr);
  if (!title_tr) {
    errors.push({ field: 'title_tr', message: 'Turkish title is required' });
  }
  req.body.title_tr = title_tr;

  // Validate English title (required)
  const title_en = cleanString(req.body.title_en);
  if (!title_en) {
    errors.push({ field: 'title_en', message: 'English title is required' });
  }
  req.body.title_en = title_en;

  // Validate Turkish description (required)
  const description_tr = cleanString(req.body.description_tr);
  if (!description_tr) {
    errors.push({ field: 'description_tr', message: 'Turkish description is required' });
  }
  req.body.description_tr = description_tr;

  // Validate English description (required)
  const description_en = cleanString(req.body.description_en);
  if (!description_en) {
    errors.push({ field: 'description_en', message: 'English description is required' });
  }
  req.body.description_en = description_en;

  // Validate author(s) - expect array
  let authors = req.body.author;
  if (!Array.isArray(authors)) {
    authors = authors ? [authors] : [];
  }
  authors = authors.map(a => cleanString(a)).filter(a => a);
  if (authors.length === 0) {
    errors.push({ field: 'author', message: 'At least one author is required' });
  }
  req.body.author = authors;

  // Validate category(ies) - expect array
  let categories = req.body.category;
  if (!Array.isArray(categories)) {
    categories = categories ? [categories] : [];
  }
  categories = categories.map(c => cleanString(c)).filter(c => c);
  if (categories.length === 0) {
    errors.push({ field: 'category', message: 'At least one category is required' });
  }
  req.body.category = categories;

  // Validate image (required) - either file or imageUrl
  const imageUrl = cleanString(req.body.imageUrl);
  const hasFile = req.file && req.file.buffer;
  
  if (!hasFile && !imageUrl) {
    errors.push({ field: 'image', message: 'Book image is required (either upload a file or provide an image URL)' });
  } else if (imageUrl && !hasFile) {
    if (!isValidHttpUrl(imageUrl)) {
      errors.push({ field: 'imageUrl', message: 'Image URL must be a valid URL' });
    } else {
      req.body.imageUrl = imageUrl;
    }
  } else {
    req.body.imageUrl = imageUrl || '';
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

  // Validate Turkish title
  if (Object.prototype.hasOwnProperty.call(req.body, 'title_tr')) {
    const title_tr = cleanString(req.body.title_tr);
    if (!title_tr) {
      errors.push({ field: 'title_tr', message: 'Turkish title cannot be empty if provided' });
    } else {
      updates.title_tr = title_tr;
    }
  }

  // Validate English title
  if (Object.prototype.hasOwnProperty.call(req.body, 'title_en')) {
    const title_en = cleanString(req.body.title_en);
    if (!title_en) {
      errors.push({ field: 'title_en', message: 'English title cannot be empty if provided' });
    } else {
      updates.title_en = title_en;
    }
  }

  // Validate Turkish description
  if (Object.prototype.hasOwnProperty.call(req.body, 'description_tr')) {
    const description_tr = cleanString(req.body.description_tr);
    if (!description_tr) {
      errors.push({ field: 'description_tr', message: 'Turkish description cannot be empty if provided' });
    } else {
      updates.description_tr = description_tr;
    }
  }

  // Validate English description
  if (Object.prototype.hasOwnProperty.call(req.body, 'description_en')) {
    const description_en = cleanString(req.body.description_en);
    if (!description_en) {
      errors.push({ field: 'description_en', message: 'English description cannot be empty if provided' });
    } else {
      updates.description_en = description_en;
    }
  }

  // Validate author(s) - expect array
  if (Object.prototype.hasOwnProperty.call(req.body, 'author')) {
    let authors = req.body.author;
    if (!Array.isArray(authors)) {
      authors = authors ? [authors] : [];
    }
    authors = authors.map(a => cleanString(a)).filter(a => a);
    if (authors.length === 0) {
      errors.push({ field: 'author', message: 'At least one author is required' });
    } else {
      updates.author = authors;
    }
  }

  // Validate category(ies) - expect array
  if (Object.prototype.hasOwnProperty.call(req.body, 'category')) {
    let categories = req.body.category;
    if (!Array.isArray(categories)) {
      categories = categories ? [categories] : [];
    }
    categories = categories.map(c => cleanString(c)).filter(c => c);
    if (categories.length === 0) {
      errors.push({ field: 'category', message: 'At least one category is required' });
    } else {
      updates.category = categories;
    }
  }

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