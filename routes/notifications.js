const express = require('express');
const router  = express.Router();
const db      = require('../db/pool');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/notifications — get current user's notifications
router.get('/', verifyToken, async (req, res) => {
  try {
    const user   = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    const result = await db.query(
      'SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',
      [user.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/notifications/unread-count
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const user   = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    const result = await db.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=false',
      [user.rows[0].id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/notifications/read-all — mark all as read
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    await db.query('UPDATE notifications SET is_read=true WHERE user_id=$1', [user.rows[0].id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/notifications/:id/read — mark one as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    await db.query('UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2', [req.params.id, user.rows[0].id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Helper — create a notification (used internally by other routes)
async function createNotification(userId, type, title, message, link) {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1,$2,$3,$4,$5)',
      [userId, type, title, message, link || null]
    );
  } catch (err) { console.error('Failed to create notification:', err.message); }
}

module.exports = { router, createNotification };
