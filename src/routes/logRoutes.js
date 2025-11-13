const express = require('express');
const rateLimit = require('express-rate-limit');
const { getAllLogs, getStats, cleanupOldLogs } = require('../controllers/logController');
const { verifyAccessToken, authorizeRoles } = require('../middleware/auth');
const { logger } = require('../services/logService');

const router = express.Router();

// Rate limiter for frontend log ingestion
const frontendLogLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // max 60 requests per minute per IP
});

/**
 * @swagger
 * /api/logs:
 *   get:
 *     summary: Get all logs (Admin only)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [info, warn, error, debug]
 *       - in: query
 *         name: operation
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Logs retrieved successfully
 */
router.get('/', verifyAccessToken, authorizeRoles('ADMIN'), getAllLogs);

/**
 * @swagger
 * /api/logs/stats:
 *   get:
 *     summary: Get log statistics (Admin only)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', verifyAccessToken, authorizeRoles('ADMIN'), getStats);

/**
 * @swagger
 * /api/logs/cleanup:
 *   delete:
 *     summary: Delete old logs (Admin only)
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 90
 *     responses:
 *       200:
 *         description: Old logs deleted successfully
 */
router.delete('/cleanup', verifyAccessToken, authorizeRoles('ADMIN'), cleanupOldLogs);

/**
 * @swagger
 * /api/logs/ingest:
 *   post:
 *     summary: Ingest frontend logs (rate limited)
 *     tags: [Logs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               level:
 *                 type: string
 *                 enum: [info, warn, error, debug]
 *               message:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Log ingested successfully
 */
router.post('/ingest', frontendLogLimiter, async (req, res) => {
  try {
    const { level = 'info', message = '', metadata = {} } = req.body || {};

    // If a server-side secret is configured, require it
    if (process.env.LOG_API_KEY) {
      const key = req.header('x-log-key');
      if (!key || key !== process.env.LOG_API_KEY) {
        return res.status(401).json({ error: 'Invalid log key' });
      }
    }

    if (!message && Object.keys(metadata).length === 0) {
      return res.status(400).json({ error: 'Either message or metadata must be provided' });
    }

    const timestamp = new Date().toISOString();

    // Create log entry in MongoDB with frontend metadata
    await logger[level](message, {
      req,
      operation: 'system',
      metadata: {
        ...metadata,
        source: 'frontend',
        timestamp,
        referer: req.get('referer'),
      },
    });

    return res.status(201).json({ 
      success: true,
      message: 'Log ingested successfully' 
    });
  } catch (err) {
    console.error('Failed to ingest log:', err);
    return res.status(500).json({ 
      success: false,
      error: 'Failed to persist log' 
    });
  }
});

module.exports = router;
