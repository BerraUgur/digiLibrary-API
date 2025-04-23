const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');
const { verifyAccessToken, authorizeRoles } = require('../middleware/auth');
const { addBookValidationRules, updateBookValidationRules } = require('../validators/bookValidator');
const { validationResult } = require('express-validator');
const ROLES = require('../constants/roles');

/**
 * @swagger
 * tags:
 *   name: Books
 *   description: API endpoints for book management
 */

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: List all books
 *     tags: [Books]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter books by category
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *         description: Sort books by a specific field
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order (ascending or descending)
 *     responses:
 *       200:
 *         description: List of books
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Add a new book
 *     tags: [Books]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       201:
 *         description: Book added successfully
 *       400:
 *         description: Bad request
 */

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Update book details
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               author:
 *                 type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Book updated successfully
 *       404:
 *         description: Book not found
 */

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Delete a book
 *     tags: [Books]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Book ID
 *     responses:
 *       200:
 *         description: Book deleted successfully
 *       404:
 *         description: Book not found
 */

// Middleware to handle validation errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Routes for book management
// List all books (with filtering and sorting)
router.get('/', bookController.getAllBooks);

// Add a new book (user only)
router.post('/', verifyAccessToken, authorizeRoles(ROLES.USER), addBookValidationRules, validate, bookController.createBook);

// Update book details (user only, only if owner)
router.put('/:id', verifyAccessToken, authorizeRoles(ROLES.USER), updateBookValidationRules, validate, bookController.updateBook);

// Delete a book (admin or user only, only if owner)
router.delete('/:id', verifyAccessToken, authorizeRoles(ROLES.ADMIN, ROLES.USER), bookController.deleteBook);

module.exports = router;