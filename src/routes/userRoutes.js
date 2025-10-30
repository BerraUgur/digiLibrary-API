const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyAccessToken, authorizeRoles } = require('../middleware/auth');
const ROLES = require('../constants/rolesConstants');
const { addFavorite, getFavorites, removeFavorite } = require('../controllers/favoriteController');

// User profile routes
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
router.get('/profile', verifyAccessToken, userController.getUserProfile);

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
router.put('/profile', verifyAccessToken, userController.updateUserProfile);

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
router.put('/password', verifyAccessToken, userController.updatePassword);

// Favorites routes
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
 */
router.post('/favorites', verifyAccessToken, addFavorite);

/**
 * @swagger
 * /api/users/favorites:
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
 */
router.get('/favorites', verifyAccessToken, getFavorites);

/**
 * @swagger
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
router.delete('/favorites/:favoriteId', verifyAccessToken, removeFavorite);

// Admin routes
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
router.get('/', verifyAccessToken, authorizeRoles(ROLES.ADMIN), userController.getAllUsers);

router.put('/:id', verifyAccessToken, authorizeRoles(ROLES.ADMIN), userController.updateUser);

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
router.delete('/:id', verifyAccessToken, authorizeRoles(ROLES.ADMIN), userController.deleteUser);

module.exports = router;