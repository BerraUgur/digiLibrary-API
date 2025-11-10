const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Iyzipay = require('iyzipay');
const { logErrorDetails } = require('../middleware/logEvents');
const Book = require('../models/Book');
const User = require('../models/User');

// Iyzico configuration
const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY,
  secretKey: process.env.IYZICO_SECRET_KEY,
  uri: process.env.IYZICO_BASE_URL
});

const createCheckoutSession = async (req, res) => {
  try {
    const { bookId } = req.body;
    const user = await User.findById(req.user.id);
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins are not allowed to purchase books.' });
    }
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    if (book.available === false) {
      return res.status(400).json({ success: false, message: 'Book is out of stock or unavailable.' });
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'try',
            product_data: {
              name: book.title,
              description: book.author,
            },
            unit_amount: Math.round((book.price || 100) * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/books?canceled=true`,
      metadata: {
        bookId: book._id.toString(),
        userId: user._id.toString(),
      },
    });
    res.status(200).json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    await logErrorDetails('Create Checkout Session Failed', error, req, {
      bookId: req.body?.bookId || 'N/A'
    });
    res.status(500).json({ success: false, message: 'An error occurred while creating payment session.', error: error.message });
  }
};

const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const bookId = session.metadata.bookId;
      const book = await Book.findById(bookId);
      if (book) {
        book.available = false;
        await book.save();
      }
    } catch (error) {
      await logErrorDetails('Webhook Post-Payment Processing Failed', error, req, {
        bookId: session.metadata?.bookId || 'N/A',
        eventType: event.type
      });
      return res.status(500).json({ success: false, message: 'Post-payment processing error' });
    }
  }
  res.status(200).json({ success: true, message: 'Webhook received' });
};

const createLateFeeCheckoutSession = async (req, res) => {
  try {
    const { loanId } = req.body;
    const Loan = require('../models/Loan');

    const loan = await Loan.findById(loanId).populate('book user');

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan record not found' });
    }

    if (!loan.lateFee || loan.lateFee <= 0) {
      return res.status(400).json({ success: false, message: 'No late fee to pay' });
    }

    if (loan.lateFeePaid) {
      return res.status(400).json({ success: false, message: 'This fee has already been paid' });
    }

    const frontendUrl = process.env.FRONTEND_URL;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'try',
            product_data: {
              name: `Late Return Fee - ${loan.book.title}`,
              description: `${loan.daysLate} days late fee`,
            },
            unit_amount: Math.round(loan.lateFee * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${frontendUrl}/late-fees?payment=success`,
      cancel_url: `${frontendUrl}/late-fees?payment=canceled`,
      phone_number_collection: {
        enabled: false,
      },
      metadata: {
        loanId: loan._id.toString(),
        userId: req.user.id,
        lateFee: loan.lateFee.toString(),
      },
    });

    res.status(200).json({ success: true, sessionId: session.id, url: session.url });

  } catch (error) {
    await logErrorDetails('Create Late Fee Checkout Session Failed', error, req, {
      loanId: req.body?.loanId || 'N/A'
    });
    res.status(500).json({
      success: false,
      message: 'Error creating payment session',
      error: error.message
    });
  }
};

const confirmLateFeePayment = async (req, res) => {
  try {
    const { loanId, sessionId } = req.body;
    const Loan = require('../models/Loan');

    const loan = await Loan.findById(loanId);

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan record not found' });
    }

    // Keep lateFee and daysLate for record keeping - DO NOT RESET TO 0
    loan.lateFeePaid = true;
    loan.lateFeePaymentDate = new Date();
    loan.stripePaymentId = sessionId || 'stripe-payment';
    loan.paymentMethod = 'stripe';

    await loan.save();

    res.status(200).json({
      success: true,
      message: 'Payment successful! Your late fee has been cleared.'
    });

  } catch (error) {
    await logErrorDetails('Confirm Late Fee Payment Failed', error, req, {
      loanId: req.body?.loanId || 'N/A'
    });
    res.status(500).json({
      success: false,
      message: 'Error confirming payment',
      error: error.message
    });
  }
};

// IYZICO METHODS
const createIyzicoCheckoutSession = async (req, res) => {
  try {
    const { bookId } = req.body;
    const user = await User.findById(req.user.id);
    
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins are not allowed to purchase books.' });
    }
    
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Book not found.' });
    }
    
    if (book.available === false) {
      return res.status(400).json({ success: false, message: 'Book is out of stock or unavailable.' });
    }

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: bookId,
      price: (book.price || 100).toFixed(2),
      paidPrice: (book.price || 100).toFixed(2),
      currency: Iyzipay.CURRENCY.TRY,
      basketId: bookId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: `${process.env.API_URL}/api/payments/iyzico-book-callback`,
      enabledInstallments: [1],
      buyer: {
        id: user._id.toString(),
        name: user.name || 'User',
        surname: user.surname || 'User',
        gsmNumber: user.phone || '+905555555',
        email: user.email,
        identityNumber: '11111111111',
        registrationAddress: 'Address',
        ip: req.ip || '85.34.78.112',
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34732'
      },
      shippingAddress: {
        contactName: `${user.name || 'User'} ${user.surname || 'User'}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Address',
        zipCode: '34732'
      },
      billingAddress: {
        contactName: `${user.name || 'User'} ${user.surname || 'User'}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Address',
        zipCode: '34732'
      },
      basketItems: [
        {
          id: book._id.toString(),
          name: book.title,
          category1: 'Book',
          itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
          price: (book.price || 100).toFixed(2)
        }
      ]
    };

    iyzipay.checkoutFormInitialize.create(request, async (err, result) => {
      if (err) {
        await logErrorDetails('Create Iyzico Book Checkout Failed', err, req, {
          bookId: bookId || 'N/A'
        });
        return res.status(500).json({
          success: false,
          message: 'Error creating Iyzico payment',
          error: err.errorMessage || err.message
        });
      }

      if (result.status === 'success') {
        res.status(200).json({
          success: true,
          token: result.token,
          paymentPageUrl: result.paymentPageUrl,
          checkoutFormContent: result.checkoutFormContent
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage || 'Payment initialization failed'
        });
      }
    });

  } catch (error) {
    await logErrorDetails('Create Iyzico Checkout Session Failed', error, req, {
      bookId: req.body?.bookId || 'N/A'
    });
    res.status(500).json({
      success: false,
      message: 'An error occurred while creating payment session.',
      error: error.message
    });
  }
};

const handleIyzicoBookCallback = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      // HTML response for missing token
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <script>
            window.top.location.href = '${process.env.FRONTEND_URL}/books?payment=failed';
          </script>
        </head>
        <body>Redirecting...</body>
        </html>
      `);
    }

    const request = {
      locale: Iyzipay.LOCALE.TR,
      token: token
    };

    iyzipay.checkoutForm.retrieve(request, async (err, result) => {
      if (err) {
        await logErrorDetails('Iyzico Book Callback Retrieve Failed', err, req, {
          token: token
        });
        // HTML response with JavaScript redirect
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <script>
              window.top.location.href = '${process.env.FRONTEND_URL}/books?payment=failed';
            </script>
          </head>
          <body>Redirecting...</body>
          </html>
        `);
      }

      if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
        const bookId = result.basketId;
        const book = await Book.findById(bookId);

        if (book) {
          book.available = false;
          await book.save();
        }

        // HTML response with JavaScript redirect
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <script>
              window.top.location.href = '${process.env.FRONTEND_URL}/success?payment=success&method=iyzico';
            </script>
          </head>
          <body>Payment successful! Redirecting...</body>
          </html>
        `);
      } else {
        // HTML response with JavaScript redirect
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <script>
              window.top.location.href = '${process.env.FRONTEND_URL}/books?payment=failed';
            </script>
          </head>
          <body>Redirecting...</body>
          </html>
        `);
      }
    });

  } catch (error) {
    await logErrorDetails('Iyzico Book Callback Failed', error, req, {
      token: req.body?.token || 'N/A'
    });
    // HTML response with JavaScript redirect
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          window.top.location.href = '${process.env.FRONTEND_URL}/books?payment=failed';
        </script>
      </head>
      <body>Redirecting...</body>
      </html>
    `);
  }
};

const createIyzicoLateFeeCheckout = async (req, res) => {
  try {
    const { loanId } = req.body;
    const Loan = require('../models/Loan');

    const loan = await Loan.findById(loanId).populate('book user');

    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan record not found' });
    }

    if (!loan.lateFee || loan.lateFee <= 0) {
      return res.status(400).json({ success: false, message: 'No late fee to pay' });
    }

    if (loan.lateFeePaid) {
      return res.status(400).json({ success: false, message: 'This fee has already been paid' });
    }

    const frontendUrl = process.env.FRONTEND_URL;

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: loanId,
      price: loan.lateFee.toFixed(2),
      paidPrice: loan.lateFee.toFixed(2),
      currency: Iyzipay.CURRENCY.TRY,
      basketId: loanId,
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: `${process.env.API_URL}/api/payments/iyzico-callback`,
      enabledInstallments: [1],
      buyer: {
        id: loan.user._id.toString(),
        name: loan.user.name || 'User',
        surname: loan.user.surname || 'User',
        gsmNumber: loan.user.phone || '+905555555555',
        email: loan.user.email,
        identityNumber: '11111111111',
        registrationAddress: 'Address',
        ip: req.ip || '85.34.78.112',
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34732'
      },
      shippingAddress: {
        contactName: `${loan.user.name || 'User'} ${loan.user.surname || 'User'}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Address',
        zipCode: '34732'
      },
      billingAddress: {
        contactName: `${loan.user.name || 'User'} ${loan.user.surname || 'User'}`,
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Address',
        zipCode: '34732'
      },
      basketItems: [
        {
          id: loan.book._id.toString(),
          name: `Late Return Fee - ${loan.book.title}`,
          category1: 'Late Fee',
          itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
          price: loan.lateFee.toFixed(2)
        }
      ]
    };

    iyzipay.checkoutFormInitialize.create(request, async (err, result) => {
      if (err) {
        await logErrorDetails('Create Iyzico Checkout Failed', err, req, {
          loanId: loanId || 'N/A'
        });
        return res.status(500).json({
          success: false,
          message: 'Error creating Iyzico payment',
          error: err.errorMessage || err.message
        });
      }

      if (result.status === 'success') {
        res.status(200).json({
          success: true,
          token: result.token,
          paymentPageUrl: result.paymentPageUrl,
          checkoutFormContent: result.checkoutFormContent
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.errorMessage || 'Payment initialization failed'
        });
      }
    });

  } catch (error) {
    await logErrorDetails('Create Iyzico Late Fee Checkout Session Failed', error, req, {
      loanId: req.body?.loanId || 'N/A'
    });
    res.status(500).json({
      success: false,
      message: 'Error creating payment session',
      error: error.message
    });
  }
};

const handleIyzicoCallback = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      // HTML response for missing token
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <script>
            window.location.href = '${process.env.FRONTEND_URL}/late-fees?payment=failed';
          </script>
        </head>
        <body>Redirecting...</body>
        </html>
      `);
    }

    const request = {
      locale: Iyzipay.LOCALE.TR,
      token: token
    };

    iyzipay.checkoutForm.retrieve(request, async (err, result) => {
      if (err) {
        await logErrorDetails('Iyzico Callback Retrieve Failed', err, req, {
          token: token
        });
        // HTML response with JavaScript redirect
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <script>
              window.location.href = '${process.env.FRONTEND_URL}/late-fees?payment=failed';
            </script>
          </head>
          <body>Redirecting...</body>
          </html>
        `);
      }

      if (result.status === 'success' && result.paymentStatus === 'SUCCESS') {
        const Loan = require('../models/Loan');
        const loanId = result.basketId;

        const loan = await Loan.findById(loanId);

        if (loan) {
          // Keep lateFee and daysLate for record keeping - DO NOT RESET TO 0
          loan.lateFeePaid = true;
          loan.lateFeePaymentDate = new Date();
          loan.iyzicoPaymentId = result.paymentId;
          loan.paymentMethod = 'iyzico';
          await loan.save();
        }

        // HTML response with JavaScript redirect
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <script>
              window.top.location.href = '${process.env.FRONTEND_URL}/late-fees?payment=success&method=iyzico';
            </script>
          </head>
          <body>Payment successful! Redirecting...</body>
          </html>
        `);
      } else {
        // Payment failed or cancelled
        const frontendUrl = process.env.FRONTEND_URL;
        const isUserCancelled = result.errorMessage && result.errorMessage.toLowerCase().includes('cancel');
        const redirectUrl = isUserCancelled 
          ? `${frontendUrl}/late-fees?payment=canceled`
          : `${frontendUrl}/late-fees?payment=failed`;
        
        // HTML response with JavaScript redirect
        return res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <script>
              window.top.location.href = '${redirectUrl}';
            </script>
          </head>
          <body>Redirecting...</body>
          </html>
        `);
      }
    });

  } catch (error) {
    await logErrorDetails('Iyzico Callback Failed', error, req, {
      token: req.body?.token || 'N/A'
    });
    // HTML response with JavaScript redirect
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <script>
          window.location.href = '${process.env.FRONTEND_URL}/late-fees?payment=failed';
        </script>
      </head>
      <body>Redirecting...</body>
      </html>
    `);
  }
};

module.exports = {
  createCheckoutSession,
  handleWebhook,
  createLateFeeCheckoutSession,
  confirmLateFeePayment,
  createIyzicoCheckoutSession,
  handleIyzicoBookCallback,
  createIyzicoLateFeeCheckout,
  handleIyzicoCallback
};