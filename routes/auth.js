const express = require('express');
const router  = express.Router();
const db      = require('../db/pool');
const { verifyToken } = require('../middleware/authMiddleware');

// POST /api/auth/register
// Called after Firebase Google login — saves user if new, returns role
router.post('/register', verifyToken, async (req, res) => {
  const { email, name, username, role } = req.body;
  const firebase_uid = req.user.uid;
  const validRole = ['seeker','employer'].includes(role) ? role : 'seeker';
  try {
    const result = await db.query(
      `INSERT INTO users (firebase_uid, email, name, username, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (firebase_uid) DO UPDATE
         SET email    = EXCLUDED.email,
             username = COALESCE(EXCLUDED.username, users.username)
       RETURNING id, role, username`,
      [firebase_uid, email, name, username || null, validRole]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GET /api/auth/me — return current user's profile including username
router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, username, role FROM users WHERE firebase_uid = $1`,
      [req.user.uid]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

module.exports = router;
