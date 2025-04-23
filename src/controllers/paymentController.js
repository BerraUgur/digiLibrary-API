const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Book = require('../models/Book');
const User = require('../models/User');

// Create Stripe checkout session
const createCheckoutSession = async (req, res) => {
  try {
    const { bookId } = req.body;
    const user = await User.findById(req.user.id);
    if (user.role === 'admin') {
      return res.status(403).json({ success: false, message: 'Admins are not allowed to purchase books.' });
    }
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, message: 'Kitap bulunamadı' });
    }
    // Kullanıcı kendi kitabını satın alamaz
    if (book.owner.toString() === req.user.id) {
      return res.status(400).json({ success: false, message: 'Kendi eklediğiniz kitabı satın alamazsınız.' });
    }
    if (book.available === false) {
      return res.status(400).json({ success: false, message: 'Kitap stokta yok veya satılamaz.' });
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
            unit_amount: Math.round((book.price || 100) * 100), // Varsayılan fiyat: 100 TL
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.protocol}://${req.get('host')}/books?canceled=true`,
      locale: 'tr',
      metadata: {
        bookId: book._id.toString(),
        userId: user._id.toString(),
      },
    });
    res.status(200).json({ success: true, sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe session oluşturma hatası:', error);
    res.status(500).json({ success: false, message: 'Ödeme oturumu oluşturulurken bir hata oluştu', error: error.message });
  }
};

// Stripe webhook handler
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
    console.error('Webhook hata:', err.message);
    return res.status(400).json({ success: false, message: `Webhook Error: ${err.message}` });
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    try {
      const bookId = session.metadata.bookId;
      // Kitap stok güncelleme
      const book = await Book.findById(bookId);
      if (book) {
        book.available = false; // Satıldıysa artık ödünç alınamaz/satılamaz
        await book.save();
      }
      // Burada başka işlemler de eklenebilir (sipariş kaydı, kullanıcıya bildirim vs.)
      console.log('Ödeme başarılı:', session);
    } catch (error) {
      console.error('Ödeme sonrası işlem hatası:', error);
      return res.status(500).json({ success: false, message: 'Ödeme sonrası işlem hatası' });
    }
  }
  res.status(200).json({ success: true, message: 'Webhook alındı' });
};

module.exports = { createCheckoutSession, handleWebhook };