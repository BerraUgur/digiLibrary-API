const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyAccessToken, authorizeRoles } = require('../middleware/auth');
const ROLES = require('../constants/roles');
const { addFavorite, getFavorites, removeFavorite } = require('../controllers/favoriteController');

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: API endpoints for user management
 */

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *       404:
 *         description: User not found
 */

/**
 * @swagger
 * /api/users/password:
 *   put:
 *     summary: Update user password
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Bad request
 */

/**
 * @swagger
 * /api/users/favorites:
 *   post:
 *     summary: Add a book to favorites
 *     tags: [Favorites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookId:
 *                 type: string
 *                 description: ID of the book to be added to favorites
 *     responses:
 *       201:
 *         description: Book added to favorites successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 *
 *   get:
 *     summary: Get all favorite books for a user
 *     tags: [Favorites]
 *     responses:
 *       200:
 *         description: List of favorite books retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Favorite'
 *       500:
 *         description: Internal server error
 *
 * /api/users/favorites/{favoriteId}:
 *   delete:
 *     summary: Remove a book from favorites
 *     tags: [Favorites]
 *     parameters:
 *       - in: path
 *         name: favoriteId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the favorite to be removed
 *     responses:
 *       200:
 *         description: Favorite removed successfully
 *       404:
 *         description: Favorite not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       404:
 *         description: User not found
 *       403:
 *         description: Forbidden
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin only)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *       403:
 *         description: Forbidden
 */

// Routes for user management
// Get user profile
router.get('/profile', verifyAccessToken, userController.getUserProfile);

// Update user profile
router.put('/profile', verifyAccessToken, userController.updateUserProfile);

// Update user password
router.put('/password', verifyAccessToken, userController.updatePassword);

// Add a book to favorites
router.post('/favorites', verifyAccessToken, addFavorite);

// Get all favorite books for a user
router.get('/favorites', verifyAccessToken, getFavorites);

// Remove a book from favorites
router.delete('/favorites/:favoriteId', verifyAccessToken, removeFavorite);

// Kullanıcıları listeleme endpoint'i
router.get('/users', verifyAccessToken, authorizeRoles(ROLES.ADMIN), userController.getAllUsers);

// Kullanıcı silme (sadece admin)
router.delete('/:id', verifyAccessToken, authorizeRoles(ROLES.ADMIN), userController.deleteUser);

module.exports = router;