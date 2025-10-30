const swaggerJsdoc = require("swagger-jsdoc");
const path = require('path');

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "DigiLibrary API",
      version: "1.0.0",
      description: "Comprehensive API for managing DigiLibrary operations including books, loans, users, and payments",
      contact: {
        name: "DigiLibrary Development Team",
        email: "dev@digilibrary.com"
      }
    },
    servers: [
      {
        url: process.env.API_URL || "http://localhost:3000",
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: "object",
          required: ["username", "email", "role"],
          properties: {
            _id: { 
              type: "string", 
              description: "User ID",
              example: "507f1f77bcf86cd799439011"
            },
            username: { 
              type: "string", 
              description: "Username of the user",
              example: "john_doe"
            },
            email: { 
              type: "string", 
              format: "email",
              description: "Email address of the user",
              example: "john@example.com"
            },
            role: {
              type: "string",
              enum: ["user", "admin"],
              description: "User role (user or admin)",
              example: "user"
            },
            banUntil: {
              type: "string",
              format: "date-time",
              description: "Ban expiration date. User cannot borrow books until this date",
              example: "2024-06-30T23:59:59Z",
              nullable: true
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Account creation timestamp"
            }
          },
        },
        Book: {
          type: "object",
          required: ["title", "author", "category", "description"],
          properties: {
            _id: { 
              type: "string", 
              description: "Book ID",
              example: "507f1f77bcf86cd799439011"
            },
            title: { 
              type: "string", 
              description: "Title of the book",
              example: "1984"
            },
            author: { 
              type: "string", 
              description: "Author of the book",
              example: "George Orwell"
            },
            category: { 
              type: "string", 
              description: "Category of the book",
              enum: ["Fiction", "Science", "History", "Art", "Technology"],
              example: "Fiction"
            },
            description: {
              type: "string",
              description: "Detailed description of the book",
              example: "A dystopian social science fiction novel..."
            },
            imageUrl: { 
              type: "string", 
              description: "URL of the book cover image",
              example: "/uploads/book-cover-1234.jpg"
            },
            available: {
              type: "boolean",
              description: "Whether the book is available for borrowing",
              example: true
            },
            addedBy: {
              type: "string",
              description: "ID of the admin who added this book"
            },
            reviewCount: {
              type: "integer",
              description: "Number of reviews (populated with stats=1)",
              example: 5
            },
            avgRating: {
              type: "number",
              description: "Average rating from reviews (populated with stats=1)",
              example: 4.5
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Book addition timestamp"
            }
          },
        },
        Favorite: {
          type: "object",
          properties: {
            id: { type: "string", description: "Favorite ID" },
            userId: { type: "string", description: "ID of the user who favorited the book" },
            bookId: { type: "string", description: "ID of the favorited book" },
          },
        },
        Review: {
          type: "object",
          properties: {
            id: { type: "string", description: "Review ID" },
            bookId: { type: "string", description: "ID of the book being reviewed" },
            reviewText: { type: "string", description: "Text of the review" },
            rating: { type: "integer", description: "Rating given in the review", minimum: 1, maximum: 5 },
          },
        },
        Loan: {
          type: "object",
          required: ["bookId", "userId", "borrowDate", "dueDate"],
          properties: {
            _id: { 
              type: "string", 
              description: "Loan ID",
              example: "507f1f77bcf86cd799439011"
            },
            bookId: { 
              type: "string", 
              description: "ID of the borrowed book (populated in responses)",
              example: "507f1f77bcf86cd799439022"
            },
            userId: { 
              type: "string", 
              description: "ID of the user who borrowed the book",
              example: "507f1f77bcf86cd799439033"
            },
            borrowDate: { 
              type: "string", 
              format: "date-time", 
              description: "Date when the book was borrowed",
              example: "2024-06-01T10:00:00Z"
            },
            dueDate: { 
              type: "string", 
              format: "date", 
              description: "Due date for book return (14 days from borrow)",
              example: "2024-06-15"
            },
            returnDate: { 
              type: "string", 
              format: "date-time", 
              description: "Date when the book was actually returned",
              example: "2024-06-14T15:30:00Z",
              nullable: true
            },
            daysLate: {
              type: "integer",
              description: "Number of days the return is late. Calculated if book returned after dueDate",
              example: 3,
              default: 0
            },
            lateFee: {
              type: "number",
              description: "Late fee amount in TL (5 TL per day late). 0 if returned on time or unpaid",
              example: 15.0,
              default: 0
            },
            lateFeeStatus: {
              type: "string",
              enum: ["none", "pending", "paid"],
              description: "Status of late fee payment",
              example: "pending",
              default: "none"
            },
            stripeSessionId: {
              type: "string",
              description: "Stripe checkout session ID for payment tracking",
              nullable: true
            }
          },
        },
      },
    },
    security: []
  },
  // Note: path is relative to this file, point to backend routes
  apis: [path.join(__dirname, '..', 'routes', '*.js')],
};

module.exports = swaggerJsdoc(options);