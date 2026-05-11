const express = require('express');
const router  = express.Router();
const db      = require('../db/pool');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// GET /api/jobs — all open jobs (seeker) OR employer's own jobs (?mine=true)
router.get('/', async (req, res) => {
  try {
    const { search, location, type, mine } = req.query;
    const params = [];

    // Employer requesting only their own jobs
    if (mine === 'true') {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'Auth required' });
      const admin = require('firebase-admin');
      const token = authHeader.split(' ')[1];
      const decoded = await admin.auth().verifyIdToken(token);
      const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [decoded.uid]);
      if (!user.rows.length) return res.json([]);
      params.push(user.rows[0].id);
      const result = await db.query(
        `SELECT j.*, u.name AS employer_name FROM jobs j JOIN users u ON j.employer_id = u.id WHERE j.employer_id=$1 ORDER BY j.created_at DESC`,
        params
      );
      return res.json(result.rows);
    }

    // Seeker: all open jobs with filters
    let query = `SELECT j.*, u.name AS employer_name FROM jobs j JOIN users u ON j.employer_id = u.id WHERE j.status = 'open'`;
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (j.title ILIKE $${params.length} OR j.description ILIKE $${params.length} OR j.requirements ILIKE $${params.length})`;
    }
    if (location) {
      params.push(`%${location}%`);
      query += ` AND j.location ILIKE $${params.length}`;
    }
    if (type && type !== 'all') {
      params.push(type);
      query += ` AND j.job_type = $${params.length}`;
    }
    query += ` ORDER BY j.created_at DESC`;
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/:id — single job
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT j.*, u.name AS employer_name FROM jobs j JOIN users u ON j.employer_id = u.id WHERE j.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/jobs — post a new job (employer only)
router.post('/', verifyToken, async (req, res) => {
  const { title, description, requirements, location, salary, job_type, status } = req.body;
  try {
    const user = await db.query(`SELECT id, role FROM users WHERE firebase_uid = $1`, [req.user.uid]);
    if (!user.rows.length || user.rows[0].role !== 'employer') {
      return res.status(403).json({ error: 'Employers only' });
    }
    const result = await db.query(
      `INSERT INTO jobs (employer_id, title, description, requirements, location, salary, job_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [user.rows[0].id, title, description, requirements, location, salary, job_type || 'full-time', status || 'open']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// PUT /api/jobs/:id — edit job (employer only)
router.put('/:id', verifyToken, async (req, res) => {
  const { title, description, requirements, location, salary, job_type, status } = req.body;
  try {
    const user = await db.query(`SELECT id FROM users WHERE firebase_uid = $1`, [req.user.uid]);
    const result = await db.query(
      `UPDATE jobs SET title=$1, description=$2, requirements=$3, location=$4, salary=$5, status=$6, job_type=$7
       WHERE id=$8 AND employer_id=$9 RETURNING *`,
      [title, description, requirements, location, salary, status, job_type || 'full-time', req.params.id, user.rows[0].id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found or not yours' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// DELETE /api/jobs/:id — delete job (employer or admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const user = await db.query(`SELECT id, role FROM users WHERE firebase_uid = $1`, [req.user.uid]);
    const u = user.rows[0];
    let result;
    if (u.role === 'admin') {
      result = await db.query(`DELETE FROM jobs WHERE id=$1 RETURNING id`, [req.params.id]);
    } else {
      result = await db.query(`DELETE FROM jobs WHERE id=$1 AND employer_id=$2 RETURNING id`, [req.params.id, u.id]);
    }
    if (!result.rows.length) return res.status(404).json({ error: 'Job not found or not yours' });
    res.json({ message: 'Job deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

module.exports = router;
