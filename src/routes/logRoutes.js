const express = require('express');
const rateLimit = require('express-rate-limit');
const { logEvents } = require('../middleware/logEvents');

const router = express.Router();

// Protect this ingestion endpoint from abuse (simple rate limit)
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // max 60 requests per minute per IP
});

// POST /api/logs
router.post('/', limiter, async (req, res) => {
    try {
        const { level = 'info', message = '', meta = {} } = req.body || {};

        // If a server-side secret is configured, require it
        if (process.env.LOG_API_KEY) {
            const key = req.header('x-log-key');
            if (!key || key !== process.env.LOG_API_KEY) {
                return res.status(401).json({ error: 'Invalid log key' });
            }
        }

        if (!message && Object.keys(meta).length === 0) {
            return res.status(400).json({ error: 'Either message or meta must be provided' });
        }

        const timestamp = new Date().toISOString();
        const payload = {
            level,
            message,
            meta,
            ip: req.ip,
            userAgent: req.get('user-agent') || 'unknown',
            url: req.get('referer') || req.originalUrl || 'unknown',
            timestamp,
        };

        // Build formatted message for server logs
        const formatted = `[REMOTE UI LOG]\n[LEVEL] ${level}\n[TIMESTAMP] ${timestamp}\n[MESSAGE] ${message}\n[PAYLOAD] ${JSON.stringify(
            meta,
            null,
            2
        )}\n[IP] ${payload.ip}\n[USER-AGENT] ${payload.userAgent}`;

        // Choose file by level for easier filtering
        const fileName = (level && level.toLowerCase() === 'error') ? 'uiError.log' : 'uiInfo.log';

        await logEvents(formatted, fileName);

        return res.status(201).json({ status: 'logged' });
    } catch (err) {
        // Fallback: log synchronous console error (this is server-side only)
        console.error('Failed to persist UI log:', err);
        return res.status(500).json({ error: 'Failed to persist log' });
    }
});

module.exports = router;
