# 📚 Digital Library API

A comprehensive RESTful API for a digital library management system built with Node.js, Express, and MongoDB.

## ✨ Features

- 🔐 **Authentication & Authorization** - JWT-based auth with access/refresh tokens
- 📖 **Book Management** - CRUD operations with image upload (GridFS)
- 👥 **User Management** - Profile management, role-based access control
- 📝 **Loan System** - Book borrowing with automated reminders and late fee calculations
- ⭐ **Reviews & Ratings** - User reviews with 1-5 star ratings
- 💳 **Payment Integration** - Stripe checkout for late fee payments
- 📧 **Email Notifications** - Automated reminders and password reset emails
- 📊 **API Documentation** - Interactive Swagger/OpenAPI docs

## 🚀 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (Access + Refresh tokens)
- **File Storage:** GridFS (MongoDB)
- **Payment:** Stripe
- **Email:** Nodemailer (Gmail SMTP)
- **Validation:** express-validator
- **Security:** Helmet, CORS, rate limiting, mongo-sanitize
- **Scheduling:** node-cron
- **Documentation:** Swagger UI

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Gmail account (for email notifications)
- Stripe account (for payments)

## ⚙️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/BerraUgur/odev5.git
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env
```

4. **Configure environment variables**

Edit `.env` file with your actual values:

```env
# Server
NODE_ENV=development
PORT=5000

# Database
MONGO_URI=mongodb://localhost:27017/library

# Email (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password

# JWT Secrets (generate random strings)
JWT_ACCESS_SECRET=your-random-secret-here
JWT_REFRESH_SECRET=your-random-secret-here

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Generate JWT secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

5. **Start MongoDB**
```bash
# macOS/Linux
mongod

# Windows
"C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
```

6. **Run the application**
```bash
# Development (with nodemon)
npm run dev

# Production
npm start
```

## 🔗 API Endpoints

Base URL: `http://localhost:3000/api`

### 🔐 Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - User login
- `POST /auth/refresh-token` - Refresh access token
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password

### 📚 Books
- `GET /books` - List all books (public)
- `GET /books/:id` - Get book by ID (public)
- `GET /books/popular` - Get popular books (public)
- `POST /books` - Add new book (admin only)
- `PUT /books/:id` - Update book (admin only)
- `DELETE /books/:id` - Delete book (admin only)

### 👤 Users
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update profile
- `PUT /users/password` - Change password
- `GET /users` - Get all users (admin only)

### 📝 Loans
- `POST /loans/borrow` - Borrow a book
- `GET /loans/my-loans` - Get user's loans
- `PUT /loans/return/:loanId` - Return a book
- `GET /loans/admin/all` - Get all loans (admin only)

### ⭐ Reviews
- `GET /reviews` - List reviews
- `POST /reviews` - Add review
- `DELETE /reviews/:reviewId` - Delete review
- `GET /reviews/my-reviews` - Get user's reviews

### 💳 Payments
- `POST /payments/create-checkout-session` - Create Stripe session
- `POST /payments/webhook` - Stripe webhook handler
- `POST /payments/create-late-fee-checkout` - Pay late fees
- `POST /payments/confirm-late-fee-payment` - Confirm payment

### 📧 Contact
- `POST /contact` - Send contact message (public)
- `GET /contact/messages` - Get all messages (admin only)

## 🤖 Automated Tasks

The system runs two daily cron jobs:

- **09:00 AM** - Send email reminders for books due tomorrow
- **00:01 AM** - Calculate late fees for overdue books

## 🛡️ Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - bcrypt with salt rounds
- **Rate Limiting** - 100 requests per 15 minutes per IP
- **CORS Protection** - Configurable CORS policies
- **Helmet** - Secure HTTP headers
- **MongoDB Sanitization** - Prevent NoSQL injection
- **Input Validation** - express-validator

## 📦 Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── constants/       # Constants and enums
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── validators/      # Input validation
│   ├── app.js          # Express app setup
│   └── server.js       # Server entry point
├── .env.example        # Environment template
├── .gitignore         # Git ignore rules
├── package.json       # Dependencies
└── README.md         # Documentation
```

### Email Not Sending
- Verify Gmail App Password is correct (16 characters, no spaces)
- Check 2-Step Verification is enabled
- Ensure "Less secure app access" is NOT enabled (use App Password instead)

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Berra Uğur**
- GitHub: [@BerraUgur](https://github.com/BerraUgur)

## 🙏 Acknowledgments

- Express.js documentation
- MongoDB documentation
- Stripe API documentation
- JWT best practices

## 📞 Support

For support, email your-email@example.com or open an issue on GitHub.
