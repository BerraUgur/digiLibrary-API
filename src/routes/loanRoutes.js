const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { verifyAccessToken } = require('../middleware/auth');
const { borrowBookValidationRules } = require('../validators/loanValidator');
const { validationResult } = require('express-validator');

// Validation error handler middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

/**
 * @swagger
 * /api/loans/borrow:
 *   post:
 *     summary: Borrow a book from library
 *     description: |
 *       Allows users to borrow a book. System enforces multiple business rules:
 *       - Maximum 1 active borrowed book per user
 *       - Users with unpaid late fees cannot borrow
 *       - Banned users cannot borrow
 *       - Admins cannot borrow books
 *       - Book must be available
 *     tags: [Loans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookId
 *               - dueDate
 *             properties:
 *               bookId:
 *                 type: string
 *                 description: MongoDB ObjectId of the book
 *                 example: "507f1f77bcf86cd799439011"
 *               dueDate:
 *                 type: string
 *                 format: date
 *                 description: Due date for book return (typically 14 days from borrowing)
 *                 example: "2024-06-15"
 *     responses:
 *       201:
 *         description: Book borrowed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 loan:
 *                   $ref: '#/components/schemas/Loan'
 *       400:
 *         description: Bad request - validation error or business rule violation
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "Kitap mevcut değil veya başkası tarafından ödünç alınmış"
 *                     - "Aynı anda sadece 1 kitap ödünç alabilirsiniz"
 *                     - "Ödenmemiş geç iade ücretiniz var. Önce ödeme yapmalısınız"
 *       403:
 *         description: Forbidden - user is banned or has restrictions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "Kitap ödünç alma yasağınız var. Kaldırılma tarihi: 2024-06-30"
 *                     - "Admin kullanıcılar kitap ödünç alamaz"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */

// User routes
router.post('/borrow', verifyAccessToken, borrowBookValidationRules, validate, loanController.borrowBook);

/**
 * @swagger
 * /api/loans/my-loans:
 *   get:
 *     summary: List books borrowed by the user
 *     tags: [Loans]
 *     responses:
 *       200:
 *         description: List of borrowed books
 *       500:
 *         description: Server error
 */
router.get('/my-loans', verifyAccessToken, loanController.getUserLoans);

/**
 * @swagger
 * /api/loans/return/{loanId}:
 *   put:
 *     summary: Return a borrowed book
 *     tags: [Loans]
 *     parameters:
 *       - in: path
 *         name: loanId
 *         required: true
 *         schema:
 *           type: string
 *         description: Loan ID
 *     responses:
 *       200:
 *         description: Book returned successfully
 *       400:
 *         description: Bad request
 */
router.put('/return/:loanId', verifyAccessToken, loanController.returnBook);

router.get('/my-late-fees', verifyAccessToken, loanController.getUserLateFeeHistory);

// Admin routes
router.get('/admin/all', verifyAccessToken, loanController.getAllLoansAdmin);
router.get('/admin/stats', verifyAccessToken, loanController.getLateFeeStats);
router.patch('/admin/waive-fee/:loanId', verifyAccessToken, loanController.waiveLateFee);

module.exports = router;