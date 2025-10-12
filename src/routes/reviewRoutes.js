const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyAccessToken } = require('../middleware/auth');
const { addReviewValidationRules } = require('../validators/reviewValidator');
const { validationResult } = require('express-validator');

// Validation error handler middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Public routes
/**
 * @swagger
 * /api/reviews:
 *   get:
 *     summary: List reviews
 *     tags: [Reviews]
 *     parameters:
 *       - in: query
 *         name: bookId
 *         schema:
 *           type: string
 *         description: Filter reviews by book ID
 *     responses:
 *       200:
 *         description: List of reviews
 *       500:
 *         description: Server error
 */
router.get('/', reviewController.getReviews);

// User routes
/**
 * @swagger
 * /api/reviews:
 *   post:
 *     summary: Add a book review
 *     tags: [Reviews]
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
 *               - reviewText
 *               - rating
 *             properties:
 *               bookId:
 *                 type: string
 *                 description: MongoDB ObjectId of the book
 *               reviewText:
 *                 type: string
 *                 description: Review content
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 to 5 stars
 *     responses:
 *       201:
 *         description: Review added successfully
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', verifyAccessToken, addReviewValidationRules, validate, reviewController.addReview);

/**
 * @swagger
 * /api/reviews/my-reviews:
 *   get:
 *     summary: Get current user's reviews
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User reviews retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/my-reviews', verifyAccessToken, reviewController.getUserReviews);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review
 *     description: Users can only delete their own reviews
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *     responses:
 *       200:
 *         description: Review deleted successfully
 *       403:
 *         description: Forbidden - not review owner
 *       404:
 *         description: Review not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:reviewId', verifyAccessToken, reviewController.deleteReview);

// Admin routes
/**
 * @swagger
 * /api/reviews/all:
 *   get:
 *     summary: Get all reviews (Admin only)
 *     tags: [Reviews]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All reviews retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - admin only
 */
router.get('/all', verifyAccessToken, reviewController.getAllReviews);

module.exports = router;