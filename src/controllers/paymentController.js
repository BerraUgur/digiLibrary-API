const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { logErrorDetails } = require('../middleware/logEvents');
const Book = require('../models/Book');
const User = require('../models/User');

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
      locale: 'en',
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
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
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
      locale: 'en',
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
    const { loanId } = req.body;
    const Loan = require('../models/Loan');
    
    const loan = await Loan.findById(loanId);
    
    if (!loan) {
      return res.status(404).json({ success: false, message: 'Loan record not found' });
    }
    
    loan.lateFee = 0;
    loan.lateFeePaid = true;
    loan.lateFeePaymentDate = new Date();
    loan.daysLate = 0;
    
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

module.exports = { 
  createCheckoutSession, 
  handleWebhook,
  createLateFeeCheckoutSession,
  confirmLateFeePayment
};