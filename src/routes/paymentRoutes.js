const express = require('express');
const router = express.Router();
const { verifyAccessToken } = require('../middleware/auth');
const paymentController = require('../controllers/paymentController');

router.post('/create-checkout-session', verifyAccessToken, paymentController.createCheckoutSession);
router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);

module.exports = router;