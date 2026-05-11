const express = require('express');
const router  = express.Router();
const db      = require('../db/pool');
const { verifyToken } = require('../middleware/authMiddleware');

// Middleware — admin only
async function adminOnly(req, res, next) {
  try {
    const result = await db.query('SELECT role FROM users WHERE firebase_uid=$1', [req.user.uid]);
    if (!result.rows.length || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) { res.status(500).json({ error: err.message }); }
}

// GET /api/admin/stats
router.get('/stats', verifyToken, adminOnly, async (req, res) => {
  try {
    const [users, jobs, apps, seekers, employers] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users'),
      db.query('SELECT COUNT(*) FROM jobs'),
      db.query('SELECT COUNT(*) FROM applications'),
      db.query("SELECT COUNT(*) FROM users WHERE role='seeker'"),
      db.query("SELECT COUNT(*) FROM users WHERE role='employer'"),
    ]);
    res.json({
      totalUsers:     parseInt(users.rows[0].count),
      totalJobs:      parseInt(jobs.rows[0].count),
      totalApps:      parseInt(apps.rows[0].count),
      totalSeekers:   parseInt(seekers.rows[0].count),
      totalEmployers: parseInt(employers.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/users
router.get('/users', verifyToken, adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, name, email, username, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/users/:id/role
router.put('/users/:id/role', verifyToken, adminOnly, async (req, res) => {
  const { role } = req.body;
  if (!['seeker','employer','admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const result = await db.query('UPDATE users SET role=$1 WHERE id=$2 RETURNING id, name, role', [role, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/jobs
router.get('/jobs', verifyToken, adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT j.*, u.name AS employer_name,
       (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id) AS applicant_count
       FROM jobs j JOIN users u ON j.employer_id = u.id
       ORDER BY j.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/admin/jobs/:id
router.delete('/jobs/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM jobs WHERE id=$1', [req.params.id]);
    res.json({ message: 'Job deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/jobs/:id/status
router.put('/jobs/:id/status', verifyToken, adminOnly, async (req, res) => {
  const { status } = req.body;
  if (!['open','closed','pending'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const result = await db.query('UPDATE jobs SET status=$1 WHERE id=$2 RETURNING *', [status, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/admin/applications
router.get('/applications', verifyToken, adminOnly, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, j.title AS job_title, u.name AS seeker_name, u.email AS seeker_email
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN users u ON a.seeker_id = u.id
       ORDER BY a.applied_at DESC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
