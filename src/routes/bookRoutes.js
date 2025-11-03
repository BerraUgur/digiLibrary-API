const express = require('express');
const router = express.Router();
const multer = require('multer');
const bookController = require('../controllers/bookController');
const { verifyAccessToken, authorizeRoles } = require('../middleware/auth');
const {
  normalizeMultipartFields,
  validateCreateBook,
  validateUpdateBook,
} = require('../validators/bookValidator');
const ROLES = require('../constants/rolesConstants');

// Configure multer for in-memory storage (files will be saved to GridFS)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Public routes
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
router.get('/', bookController.getAllBooks);

router.get('/image/:id', bookController.streamImage);
router.get('/popular', bookController.getPopularBooks);
router.get('/stats/library', bookController.getLibraryStats);
router.get('/:id([0-9a-fA-F]{24})', bookController.getBookById);

// Admin routes
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
router.post(
  '/',
  verifyAccessToken,
  authorizeRoles(ROLES.ADMIN),
  upload.single('image'),
  normalizeMultipartFields,
  validateCreateBook,
  bookController.createBook
);

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
router.put(
  '/:id',
  verifyAccessToken,
  authorizeRoles(ROLES.ADMIN),
  upload.single('image'),
  normalizeMultipartFields,
  validateUpdateBook,
  bookController.updateBook
);

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
router.delete(
  '/:id',
  verifyAccessToken,
  authorizeRoles(ROLES.ADMIN),
  bookController.deleteBook
);

module.exports = router;
