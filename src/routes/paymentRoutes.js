const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

/**
 * @swagger
 * /api/payments/create-stripe-checkout-session:
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
router.post('/create-stripe-checkout-session', verifyAccessToken, paymentController.createCheckoutSession);

/**
 * @swagger
 * /api/payments/create-iyzico-checkout-session:
 *   post:
 *     summary: Create Iyzico checkout session for book purchase
 *     description: Creates an Iyzico checkout session and redirects user to payment page
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
 *             properties:
 *               bookId:
 *                 type: string
 *                 description: MongoDB ObjectId of the book to purchase
 *                 example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Checkout session created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Iyzico token
 *                 paymentPageUrl:
 *                   type: string
 *                   description: Iyzico payment page URL
 *                 checkoutFormContent:
 *                   type: string
 *                   description: HTML content for embedded checkout
 *       400:
 *         description: Bad request - missing required fields or book unavailable
 *       401:
 *         description: Unauthorized - invalid or missing token
 *       403:
 *         description: Forbidden - admins cannot purchase books
 *       500:
 *         description: Server error
 */
router.post('/create-iyzico-checkout-session', verifyAccessToken, paymentController.createIyzicoCheckoutSession);

/**
 * @swagger
 * /api/payments/stripe-webhook:
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
router.post('/stripe-webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

/**
 * @swagger
 * /api/payments/iyzico-book-callback:
 *   post:
 *     summary: Iyzico callback endpoint for book purchases
 *     description: Handles Iyzico callback after book purchase payment completion
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Iyzico token from callback
 *     responses:
 *       302:
 *         description: Redirects to frontend with payment status
 *       400:
 *         description: Bad request - token missing
 *       500:
 *         description: Server error
 */
router.post('/iyzico-book-callback', paymentController.handleIyzicoBookCallback);

/**
 * @swagger
 * /api/payments/create-stripe-late-fee-checkout:
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
router.post('/create-stripe-late-fee-checkout', verifyAccessToken, paymentController.createLateFeeCheckoutSession);

/**
 * @swagger
 * /api/payments/confirm-stripe-late-fee-payment:
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
router.post('/confirm-stripe-late-fee-payment', verifyAccessToken, paymentController.confirmLateFeePayment);

/**
 * @swagger
 * /api/payments/create-late-fee-iyzico-checkout:
 *   post:
 *     summary: Create Iyzico checkout session for late fee payment
 *     description: Creates an Iyzico checkout session for paying overdue book late fees
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
 *                 token:
 *                   type: string
 *                   description: Iyzico token
 *                 paymentPageUrl:
 *                   type: string
 *                   description: Iyzico payment page URL
 *                 checkoutFormContent:
 *                   type: string
 *                   description: HTML content for embedded checkout
 *       400:
 *         description: No late fee to pay or loan not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/create-late-fee-iyzico-checkout', verifyAccessToken, paymentController.createIyzicoLateFeeCheckout);

/**
 * @swagger
 * /api/payments/iyzico-callback:
 *   post:
 *     summary: Iyzico callback endpoint
 *     description: Handles Iyzico callback after payment completion
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 description: Iyzico token from callback
 *     responses:
 *       302:
 *         description: Redirects to frontend with payment status
 *       400:
 *         description: Bad request - token missing
 *       500:
 *         description: Server error
 */
router.post('/iyzico-callback', paymentController.handleIyzicoCallback);

module.exports = router;