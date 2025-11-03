const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

/**
 * @swagger
 * /api/payments/create-checkout-session:
 *   post:
 *     summary: Create Stripe checkout session for book purchase
 *     description: Creates a Stripe checkout session and redirects user to payment page
 *     tags: [Payments]
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
 *               - priceId
 *             properties:
 *               bookId:
 *                 type: string
 *                 description: MongoDB ObjectId of the book to purchase
 *                 example: "507f1f77bcf86cd799439011"
 *               priceId:
 *                 type: string
 *                 description: Stripe Price ID
 *                 example: "price_1234567890"
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Stripe checkout URL
 *                   example: "https://checkout.stripe.com/pay/cs_test_..."
 *       400:
 *         description: Bad request - missing required fields
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       500:
 *         description: Server error
 */
router.post('/create-checkout-session', verifyAccessToken, paymentController.createCheckoutSession);

/**
 * @swagger
 * /api/payments/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     description: Handles Stripe webhook events (payment success, failure, etc.)
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe webhook event payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Webhook signature verification failed
 */
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

/**
 * @swagger
 * /api/payments/create-late-fee-checkout:
 *   post:
 *     summary: Create Stripe checkout session for late fee payment
 *     description: Creates a Stripe checkout session for paying overdue book late fees
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loanId
 *             properties:
 *               loanId:
 *                 type: string
 *                 description: MongoDB ObjectId of the loan with late fees
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   description: Stripe checkout URL
 *                 sessionId:
 *                   type: string
 *                   description: Stripe session ID
 *       400:
 *         description: No late fee to pay or loan not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/create-late-fee-checkout', verifyAccessToken, paymentController.createLateFeeCheckoutSession);

/**
 * @swagger
 * /api/payments/confirm-late-fee-payment:
 *   post:
 *     summary: Confirm late fee payment after Stripe checkout
 *     description: Confirms successful payment and updates loan status, removes ban if applicable
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *                 description: Stripe session ID from checkout
 *                 example: "cs_test_a1b2c3d4e5f6"
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Late fee paid successfully"
 *                 loan:
 *                   type: object
 *                   description: Updated loan object
 *       400:
 *         description: Payment not completed or session invalid
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/confirm-late-fee-payment', verifyAccessToken, paymentController.confirmLateFeePayment);

module.exports = router;