require('dotenv').config();

// Seed script to add an admin, a user, and sample books
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Book = require('./src/models/Book');
const connectDB = require('./src/config/dbConfig');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/library';

async function seed() {
  await connectDB();

  // Clear existing users and books
  await User.deleteMany({});
  await Book.deleteMany({});

  // Create users
  const admin = new User({
    username: 'admin',
    email: 'admin@example.com',
    password: '123456',
    role: 'admin',
  });
  const user = new User({
    username: 'user',
    email: 'user@example.com',
    password: '123456',
    role: 'user',
  });
  await admin.save();
  await user.save();

  // Create books (owned by user)
  const books = [
    { title: 'Suç ve Ceza', author: 'Fyodor Dostoyevski', category: 'Roman', owner: user._id },
    { title: 'Küçük Prens', author: 'Antoine de Saint-Exupéry', category: 'Çocuk', owner: user._id },
    { title: 'Sefiller', author: 'Victor Hugo', category: 'Klasik', owner: user._id },
    { title: 'Simyacı', author: 'Paulo Coelho', category: 'Roman', owner: user._id },
  ];
  await Book.insertMany(books);

  console.log('Seed tamamlandı: admin, user ve örnek kitaplar eklendi.');
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
