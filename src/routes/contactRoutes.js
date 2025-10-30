const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { verifyAccessToken, authorizeRoles } = require('../middleware/auth');
const ROLES = require('../constants/rolesConstants');

// Public routes
/**
 * @swagger
 * /api/contact:
 *   post:
 *     summary: Send contact message
 *     description: Send a contact form message (no authentication required)
 *     tags: [Contact]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               name:
 *                 type: string
 *                 description: Sender's name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Sender's email address
 *               subject:
 *                 type: string
 *                 description: Message subject
 *               message:
 *                 type: string
 *                 description: Message content (min 10 characters)
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/', contactController.sendContactMessage);

// Admin routes
/**
 * @swagger
 * /api/contact/messages:
 *   get:
 *     summary: Get all contact messages (Admin only)
 *     description: Retrieve all contact messages with pagination and optional status filter
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, read]
 *         description: Filter by message status
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
router.get('/messages', verifyAccessToken, authorizeRoles(ROLES.ADMIN), contactController.getAllMessages);

/**
 * @swagger
 * /api/contact/unread-count:
 *   get:
 *     summary: Get unread message count (Admin only)
 *     description: Get the count of unread messages
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/unread-count', verifyAccessToken, authorizeRoles(ROLES.ADMIN), contactController.getUnreadCount);

/**
 * @swagger
 * /api/contact/messages/{id}/read:
 *   patch:
 *     summary: Mark message as read (Admin only)
 *     description: Update message status to 'read'
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message marked as read
 *       404:
 *         description: Message not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/messages/:id/read', verifyAccessToken, authorizeRoles(ROLES.ADMIN), contactController.markAsRead);

/**
 * @swagger
 * /api/contact/messages/{id}/reply:
 *   post:
 *     summary: Reply to message (Admin only)
 *     description: Send a reply to a contact message via email
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - replyMessage
 *             properties:
 *               replyMessage:
 *                 type: string
 *                 description: Reply message content (min 10 characters)
 *     responses:
 *       200:
 *         description: Reply sent successfully
 *       404:
 *         description: Message not found
 *       401:
 *         description: Unauthorized
 */
router.post('/messages/:id/reply', verifyAccessToken, authorizeRoles(ROLES.ADMIN), contactController.replyToMessage);

/**
 * @swagger
 * /api/contact/send-new-message:
 *   post:
 *     summary: Send new message to user (Admin only)
 *     description: Send a new email message directly to a user
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - subject
 *               - message
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Recipient's email address
 *               subject:
 *                 type: string
 *                 description: Message subject (min 3 characters)
 *               message:
 *                 type: string
 *                 description: Message content (min 10 characters)
 *     responses:
 *       200:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/send-new-message', verifyAccessToken, authorizeRoles(ROLES.ADMIN), contactController.sendNewMessageToUser);

/**
 * @swagger
 * /api/contact/messages/{id}:
 *   delete:
 *     summary: Delete message (Admin only)
 *     description: Permanently delete a contact message
 *     tags: [Contact]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       404:
 *         description: Message not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/messages/:id', verifyAccessToken, authorizeRoles(ROLES.ADMIN), contactController.deleteMessage);

module.exports = router;
