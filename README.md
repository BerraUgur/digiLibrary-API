# 📚 DigiLibrary API

A comprehensive RESTful API for a digital library management system built with Node.js, Express, and MongoDB. Features automated loan management, payment processing, and production-ready logging.

## ✨ Features

### Core Features
- 🔐 **Authentication & Authorization** - JWT-based auth with access/refresh tokens, role-based access (USER, ADMIN)
- 📖 **Book Management** - CRUD operations with image upload (GridFS), categories, availability tracking
- 👥 **User Management** - Profile management, role-based access, ban system
- 📝 **Loan System** - Book borrowing with 14-day duration, automated reminders, late fee calculation
- ⭐ **Reviews & Ratings** - User reviews with 1-5 star ratings, average rating calculation

### Payment & Financial
- 💳 **Payment Integration** - Stripe checkout for late fee payments (TL currency)
- 💰 **Late Fee System** - Automatic calculation (5 TL/day), payment tracking, status management
- 📊 **Financial Tracking** - Payment history, pending fees, webhook integration

### Communication
- 📧 **Email Notifications** - Automated reminders (09:00 daily), password reset, contact confirmations
- 💬 **Contact System** - Message submission, admin replies, conversation threading
- 📨 **Admin Messages** - Send notifications to users, reply to messages

### Automation & Scheduling
- ⏰ **Cron Jobs** - Daily reminders (09:00), late fee calculation (00:01)
- 🔄 **Auto-logout** - Token expiration handling, refresh token rotation
- 📊 **Statistics** - Real-time dashboard stats, loan tracking

### Technical Features
- 📊 **API Documentation** - Interactive Swagger/OpenAPI docs at `/api-docs`
- 🛡️ **Security** - Helmet, CORS, rate limiting, MongoDB sanitization, JWT refresh
- 📝 **Logging** - Structured logging with UUID, error tracking, remote UI logs
- 🌐 **Remote Logger Endpoint** - Accepts logs from frontend with rate limiting

## 🚀 Tech Stack

### Core Framework
- **Runtime:** Node.js (v16+)
- **Framework:** Express.js 4.21
- **Language:** JavaScript (ES2022+)

### Database & Storage
- **Database:** MongoDB 8.13 with Mongoose ODM
- **File Storage:** GridFS for book cover images
- **Caching:** In-memory for rate limiting

### Authentication & Security
- **Authentication:** JWT (jsonwebtoken 9.0)
- **Password Hashing:** bcrypt 5.1
- **Security Headers:** Helmet 8.1
- **CORS:** cors 2.8
- **Rate Limiting:** express-rate-limit 7.5
- **Input Sanitization:** express-mongo-sanitize 2.2, mongo-sanitize 1.1

### Payment & Email
- **Payment:** Stripe 18.0 (also has Iyzipay 2.0 configured)
- **Email:** Nodemailer 6.10 (Gmail SMTP)

### Validation & Documentation
- **Validation:** express-validator 7.2
- **API Docs:** Swagger UI Express 5.0, swagger-jsdoc 6.2

### Scheduling & Utilities
- **Cron Jobs:** node-cron 3.0 (reminders, late fees)
- **Date Handling:** date-fns 4.1
- **Unique IDs:** uuid 9.0
- **File Upload:** multer 2.0
- **Environment:** dotenv 16.5
- **Cookie Parser:** cookie-parser 1.4

### Development
- **Dev Server:** nodemon 3.1 with hot reload
- **Testing:** (Not implemented yet)

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- Gmail account (for email notifications)
- Stripe account (for payments)

## ⚙️ Installation

1. **Clone the repository**
```bash
git clone https://github.com/BerraUgur/DigiLibrary-API.git
cd DigiLibrary-API
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
# Server Configuration
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Database
MONGO_URI=mongodb://localhost:27017/DigiLibrary

# Email Configuration (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password

# JWT Secrets (generate random strings)
JWT_ACCESS_SECRET=your-random-secret-here
JWT_REFRESH_SECRET=your-random-secret-here

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Iyzipay (Optional - Turkish payment provider)
IYZIPAY_API_KEY=your-api-key
IYZIPAY_SECRET_KEY=your-secret-key
IYZIPAY_BASE_URL=https://sandbox-api.iyzipay.com

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:5173

# Remote Logger (Optional)
LOG_API_KEY=optional-secret-key-for-frontend-logs

# Contact Information
CONTACT_EMAIL=info@dijitalkutuphane.com
CONTACT_PHONE=+90 (555) 123-4567
```

**Important Setup Steps:**

**Gmail App Password:**
1. Enable 2-Step Verification on your Google Account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate new app password (select "Mail" and "Other")
4. Use the 16-character password (no spaces) in `EMAIL_PASS`

**Generate JWT Secrets:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Run twice to generate different secrets for access and refresh tokens.

**Stripe Setup:**
1. Create account at https://stripe.com
2. Get test API keys from Dashboard > Developers > API keys
3. For webhooks: Use Stripe CLI or create webhook endpoint in Dashboard

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

### 🔐 Authentication (`/auth`)
- `POST /auth/register` - Register new user (username, email, password)
- `POST /auth/login` - User login (returns access + refresh tokens)
- `POST /auth/refresh-token` - Refresh access token (requires refresh token)
- `POST /auth/logout` - User logout (invalidates refresh token)
- `POST /auth/forgot-password` - Request password reset (sends email with token)
- `POST /auth/reset-password` - Reset password with token

### 📚 Books (`/books`)
**Public:**
- `GET /books` - List all books with pagination, search, filter
  - Query params: `page`, `limit`, `search`, `category`, `available`, `sort`, `stats`
- `GET /books/:id` - Get book details by ID
- `GET /books/popular` - Get popular books (sorted by reviews/ratings)

**Admin Only:**
- `POST /books` - Add new book (with image upload via GridFS)
- `PUT /books/:id` - Update book (title, author, description, category, image)
- `DELETE /books/:id` - Delete book (also removes related loans, reviews, favorites)

### 👤 Users (`/users`)
**Authenticated:**
- `GET /users/profile` - Get current user profile
- `PUT /users/profile` - Update profile (username, email)
- `PUT /users/password` - Change password (requires old password)

**Admin Only:**
- `GET /users` - Get all users with pagination, search, filter
  - Query params: `page`, `limit`, `search`, `role`, `banned`
- `PUT /users/:userId/ban` - Ban user (set banUntil date)
- `PUT /users/:userId/unban` - Unban user (clear banUntil)
- `DELETE /users/:userId` - Delete user

### 📝 Loans (`/loans`)
**User:**
- `POST /loans/borrow` - Borrow a book (requires bookId, checks ban/availability)
- `GET /loans/my-loans` - Get user's loans (active and past)
  - Query params: `status` (active/returned)

**Admin:**
- `GET /loans/admin/all` - Get all loans with pagination, filter
  - Query params: `page`, `limit`, `status`, `userId`, `bookId`, `lateOnly`
- `PUT /loans/return/:loanId` - Process book return (calculates late fees, ban)
- `GET /loans/stats` - Get loan statistics

### ⭐ Reviews (`/reviews`)
- `GET /reviews` - List reviews (filter by bookId, userId)
- `POST /reviews` - Add review (requires bookId, rating 1-5, reviewText)
- `PUT /reviews/:reviewId` - Update review (own reviews only)
- `DELETE /reviews/:reviewId` - Delete review (own reviews or admin)
- `GET /reviews/my-reviews` - Get user's reviews

### ❤️ Favorites (`/favorites`)
- `GET /favorites` - Get user's favorite books
- `POST /favorites` - Add book to favorites (requires bookId)
- `DELETE /favorites/:bookId` - Remove book from favorites
- `GET /favorites/check/:bookId` - Check if book is favorited

### 💳 Payments (`/payments`)
- `POST /payments/create-checkout-session` - Create Stripe checkout for specific loan late fee
  - Body: `{ loanId }`
- `POST /payments/create-late-fee-checkout` - Create Stripe checkout for all pending late fees
- `POST /payments/confirm-late-fee-payment` - Confirm payment after Stripe success
  - Body: `{ sessionId }`
- `POST /payments/webhook` - Stripe webhook handler (internal, called by Stripe)
- `GET /payments/history` - Get user's payment history

### 📧 Contact (`/contact`)
**Public:**
- `POST /contact` - Send contact message (name, email, subject, message)

**Admin:**
- `GET /contact/messages` - Get all contact messages (paginated, threaded by email)
  - Query params: `page`, `status` (new/read)
- `PUT /contact/:id/read` - Mark message as read
- `POST /contact/:id/reply` - Reply to contact message (sends email)
- `POST /contact/send` - Send new message to user (by email)
- `GET /contact/unread-count` - Get count of unread messages
- `DELETE /contact/:id` - Delete contact message

### 📊 Logs (`/logs`)
**Remote Logger (Frontend):**
- `POST /logs` - Submit log from frontend
  - Body: `{ level, message, meta }`
  - Headers: `x-log-key` (optional, if LOG_API_KEY set)
  - Rate limit: 60 requests/min per IP

### 📖 API Documentation (`/api-docs`)
- `GET /api-docs` - Interactive Swagger UI documentation

## 🤖 Automated Tasks

The system runs two daily cron jobs managed by `node-cron`:

### Daily Email Reminders (09:00 AM)
- **Frequency:** Every day at 09:00
- **Function:** Sends email reminders for books due tomorrow
- **Process:**
  1. Queries loans where `dueDate` is tomorrow and not yet returned
  2. Populates user and book details
  3. Sends personalized email to each user
  4. Includes book title, due date, late fee warning
- **Email Template:** Formatted HTML with book details and return instructions

### Late Fee Calculation (00:01 AM)
- **Frequency:** Every day at 00:01 (1 minute after midnight)
- **Function:** Calculates late fees for overdue books
- **Process:**
  1. Queries all unreturned loans where `dueDate` has passed
  2. Calculates days late: `today - dueDate`
  3. Calculates late fee: `daysLate * 5 TL`
  4. Updates loan: `lateFee`, `daysLate`, `lateFeeStatus = 'pending'`
  5. Applies temporary ban: `banUntil = today + (daysLate * 2)`
- **Rules:**
  - Late Fee: 5 TL per day
  - Ban Duration: 2x days late (e.g., 3 days late = 6 days ban)
  - Status: Automatically set to 'pending' until paid

### Manual Trigger (Development)
Both cron jobs can be manually triggered for testing by calling their respective functions:
```javascript
const { sendDueReminders, calculateAllLateFees } = require('./services/reminderService');
```

## 🛡️ Security Features

### Authentication & Authorization
- **JWT Authentication** - Secure token-based auth with RS256 algorithm
- **Access Tokens** - Short-lived (15 minutes) for API requests
- **Refresh Tokens** - Long-lived (7 days) stored in database, rotated on use
- **Password Hashing** - bcrypt with salt rounds (10)
- **Role-Based Access** - USER and ADMIN roles with middleware protection

### Request Security
- **Rate Limiting** - 300 requests per 10 minutes per IP (global)
  - Authenticated users bypass rate limiting
  - Log endpoint: 60 requests per minute per IP
- **CORS Protection** - Configurable allowed origins
- **Helmet** - Secure HTTP headers (XSS, clickjacking, etc.)
- **MongoDB Sanitization** - Prevents NoSQL injection attacks
- **Input Validation** - express-validator on all inputs

### Data Security
- **Password Requirements** - Minimum 6 characters (configurable)
- **Token Expiration** - Automatic cleanup of expired tokens
- **Secure Cookies** - httpOnly, secure flags for production
- **Environment Variables** - Sensitive data in .env (never committed)

### API Security
- **Protected Routes** - JWT verification middleware
- **Admin Routes** - Additional role check middleware
- **File Upload** - GridFS with size limits, type validation
- **Error Handling** - Generic error messages to prevent info leakage

### Logging & Monitoring
- **Request Logging** - All HTTP requests logged with IP, user agent
- **Error Logging** - Detailed error logs with stack traces
- **Remote UI Logs** - Frontend logs with rate limiting and optional API key
- **Structured Logs** - UUID-based, timestamped, categorized by severity

## 📦 Project Structure

```
digiLibrary-api/
├── src/
│   ├── app.js                  # Express app setup, middleware, routes
│   ├── server.js               # Server entry point, cron jobs, graceful shutdown
│   │
│   ├── config/                 # Configuration files
│   │   ├── corsConfig.js      # CORS settings
│   │   ├── dbConfig.js        # MongoDB connection
│   │   ├── jwtConfig.js       # JWT secret keys
│   │   └── swaggerConfig.js   # Swagger/OpenAPI setup
│   │
│   ├── constants/              # Application constants
│   │   ├── bookConstants.js   # Book categories, status enums
│   │   ├── loanConstants.js   # Loan duration (14 days), late fees (5 TL/day), ban rules (2x multiplier)
│   │   ├── rolesConstants.js  # User roles (USER, ADMIN)
│   │   └── contactConstants.js # Contact info (email, phone)
│   │
│   ├── controllers/            # Route controllers (business logic)
│   │   ├── authController.js         # Login, register, refresh, logout, password reset
│   │   ├── bookController.js         # CRUD books, search, filter, image upload
│   │   ├── contactController.js      # Contact messages, replies, conversations
│   │   ├── favoriteController.js     # Add/remove favorites
│   │   ├── loanController.js         # Borrow, return, view loans, admin management
│   │   ├── paymentController.js      # Stripe checkout, webhooks
│   │   ├── reviewController.js       # Add, delete reviews
│   │   └── userController.js         # Profile, password change, user management
│   │
│   ├── middleware/             # Custom middleware
│   │   ├── auth.js            # JWT verification, role-based access
│   │   ├── errorHandler.js    # Global error handler
│   │   └── logEvents.js       # Structured logging with UUID
│   │
│   ├── models/                 # MongoDB models (Mongoose schemas)
│   │   ├── Book.js            # Book schema with reviews, favorites
│   │   ├── Contact.js         # Contact message schema with replies
│   │   ├── Favorite.js        # User-Book favorite relationship
│   │   ├── Loan.js            # Loan schema with late fees, ban tracking
│   │   ├── PasswordReset.js   # Password reset tokens
│   │   ├── RefreshToken.js    # Refresh token storage
│   │   ├── Review.js          # Book review schema
│   │   └── User.js            # User schema with bcrypt hashing
│   │
│   ├── routes/                 # API route definitions
│   │   ├── authRoutes.js      # /api/auth - Authentication endpoints
│   │   ├── bookRoutes.js      # /api/books - Book management
│   │   ├── contactRoutes.js   # /api/contact - Contact messages
│   │   ├── loanRoutes.js      # /api/loans - Loan management
│   │   ├── logRoutes.js       # /api/logs - Remote logger endpoint
│   │   ├── paymentRoutes.js   # /api/payments - Stripe payments
│   │   ├── reviewRoutes.js    # /api/reviews - Book reviews
│   │   └── userRoutes.js      # /api/users - User management
│   │
│   ├── services/               # Business logic services
│   │   ├── mailService.js     # Email sending with Nodemailer
│   │   └── reminderService.js # Cron jobs for reminders and late fees
│   │
│   ├── validators/             # Input validation schemas
│   │   ├── authValidator.js   # Login, register validation
│   │   ├── bookValidator.js   # Book CRUD validation
│   │   ├── loanValidator.js   # Borrow, return validation
│   │   └── reviewValidator.js # Review validation
│   │
│   └── logs/                   # Log files (auto-generated)
│       ├── reqLog.log         # HTTP request logs
│       ├── errLog.log         # Backend error logs
│       ├── uiInfo.log         # Frontend info logs (remote)
│       └── uiError.log        # Frontend error logs (remote)
│
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies and scripts
├── IYZICO_METHODS.txt          # Iyzipay integration notes
└── README.md                   # This file
```

### Email Not Sending
- Verify Gmail App Password is correct (16 characters, no spaces)
- Check 2-Step Verification is enabled
- Ensure "Less secure app access" is NOT enabled (use App Password instead)


---

## 🔧 Additional Features & Technical Details

### Loan System Business Logic
- **Duration:** 14 days from borrow date
- **Reminder:** Email sent 1 day before due date (09:00)
- **Late Fee:** 5 TL per day, calculated automatically at midnight (00:01)
- **Ban System:** User banned for 2x days late (e.g., 3 days late = 6 days ban)
- **Payment:** Late fees paid via Stripe, status updated automatically
- **Ban Expiration:** Users can borrow again after ban expires

### Database Models
- **User:** username, email, password (hashed), role, banUntil, refreshTokens[]
- **Book:** title, author, category, description, imageUrl, available, addedBy
- **Loan:** userId, bookId, borrowDate, dueDate, returnDate, daysLate, lateFee, lateFeeStatus, stripeSessionId
- **Review:** userId, bookId, rating (1-5), reviewText
- **Favorite:** userId, bookId (unique index)
- **Contact:** name, email, subject, message, status (new/read), reply { message, repliedAt, repliedBy }
- **RefreshToken:** token (hashed), userId, expiresAt
- **PasswordReset:** email, token (hashed), expiresAt

### GridFS File Storage
- Book cover images stored in MongoDB GridFS
- Automatic cleanup when book deleted
- Supports image upload via multer
- Accessible via `/uploads/:filename` endpoint

### Email Templates
- **Reminder Email:** Sent 1 day before due date with book details
- **Confirmation Email:** Sent when user submits contact form
- **Reply Email:** Sent when admin replies to contact message
- **Password Reset:** Secure link with token for password reset
- All emails use HTML templates with DigiLibrary branding

### Remote Logging
- Frontend sends logs to `/api/logs` endpoint
- Rate limited: 60 requests/min per IP
- Optional API key protection via `LOG_API_KEY`
- Logs stored in `uiInfo.log` (info) and `uiError.log` (error)
- Includes: level, message, metadata, timestamp, IP, user agent

### Cron Job Details
- **Timezone:** Server timezone (configurable)
- **Reminder Job:** `0 9 * * *` (09:00 daily)
- **Late Fee Job:** `1 0 * * *` (00:01 daily)
- Both jobs log execution and errors
- Graceful shutdown stops cron jobs

### Swagger Documentation
- Available at: `http://localhost:3000/api-docs`
- Interactive API testing interface
- Auto-generated from JSDoc comments in route files
- Includes request/response schemas, examples, authentication

### Error Handling
- Global error handler middleware
- Structured error logging with UUID
- Detailed logs include: operation, error type, message, stack trace, request context
- User-friendly error messages in API responses

---

## 📚 Available Scripts

```bash
# Start production server
npm start

# Start development server with hot reload (nodemon)
npm run dev

# Run tests (not implemented)
npm test
```

## 📊 Monitoring & Logging

### Log Files
- `reqLog.log` - All HTTP requests with IP, method, URL
- `errLog.log` - Backend errors with stack traces
- `uiInfo.log` - Frontend info logs (from remote logger)
- `uiError.log` - Frontend error logs (from remote logger)

## 📦 Dependencies Overview

### Core Dependencies (20)
- `express` - Web framework
- `mongoose` - MongoDB ODM
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT authentication
- `stripe` - Payment processing
- `nodemailer` - Email sending
- `node-cron` - Task scheduling
- `express-validator` - Input validation
- `helmet` - Security headers
- `cors` - Cross-origin requests
- `express-rate-limit` - Rate limiting
- `express-mongo-sanitize` & `mongo-sanitize` - NoSQL injection prevention
- `multer` - File upload
- `date-fns` - Date manipulation
- `uuid` - Unique ID generation
- `swagger-jsdoc` & `swagger-ui-express` - API documentation
- `dotenv` - Environment variables
- `cookie-parser` - Cookie parsing
- `iyzipay` - Turkish payment provider (optional)

### Dev Dependencies (1)
- `nodemon` - Development server with hot reload

## 🔐 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | development | Environment (development/production) |
| `PORT` | No | 3000 | Server port |
| `API_URL` | Yes | - | Full API URL for Swagger docs |
| `MONGO_URI` | Yes | - | MongoDB connection string |
| `EMAIL_USER` | Yes | - | Gmail address for sending emails |
| `EMAIL_PASS` | Yes | - | Gmail app password (16 chars) |
| `JWT_ACCESS_SECRET` | Yes | - | Secret for access tokens (64+ chars) |
| `JWT_REFRESH_SECRET` | Yes | - | Secret for refresh tokens (64+ chars) |
| `STRIPE_SECRET_KEY` | Yes | - | Stripe secret API key |
| `STRIPE_PUBLISHABLE_KEY` | Yes | - | Stripe publishable key |
| `STRIPE_WEBHOOK_SECRET` | No | - | Stripe webhook signing secret |
| `FRONTEND_URL` | Yes | - | Frontend URL for CORS and redirects |
| `LOG_API_KEY` | No | - | Optional API key for remote logger |
| `CONTACT_EMAIL` | No | info@... | Contact email for system |
| `CONTACT_PHONE` | No | - | Contact phone for system |
| `IYZIPAY_API_KEY` | No | - | Iyzipay API key (Turkish payments) |
| `IYZIPAY_SECRET_KEY` | No | - | Iyzipay secret key |
| `IYZIPAY_BASE_URL` | No | - | Iyzipay API base URL |

## 🎯 API Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| Global | 100 requests | 15 minutes |
| `/api/logs` | 60 requests | 1 minute |
| `/api/auth/register` | 5 requests | 1 hour |
| `/api/auth/login` | 10 requests | 15 minutes |

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
