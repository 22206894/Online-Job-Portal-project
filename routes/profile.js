const express = require('express');
const router  = express.Router();
const db      = require('../db/pool');
const { verifyToken } = require('../middleware/authMiddleware');

// GET /api/profile — get seeker profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    if (!user.rows.length) return res.status(404).json({ error: 'User not found' });
    const result = await db.query('SELECT * FROM seeker_profiles WHERE user_id=$1', [user.rows[0].id]);
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/profile — save or update seeker profile
router.post('/', verifyToken, async (req, res) => {
  const { experience_years, target_title, work_preference, salary_expectation, top_skills, industry, bio } = req.body;
  try {
    const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    const uid  = user.rows[0].id;
    const result = await db.query(
      `INSERT INTO seeker_profiles (user_id, experience_years, target_title, work_preference, salary_expectation, top_skills, industry, bio)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (user_id) DO UPDATE SET
         experience_years   = EXCLUDED.experience_years,
         target_title       = EXCLUDED.target_title,
         work_preference    = EXCLUDED.work_preference,
         salary_expectation = EXCLUDED.salary_expectation,
         top_skills         = EXCLUDED.top_skills,
         industry           = EXCLUDED.industry,
         bio                = EXCLUDED.bio,
         updated_at         = NOW()
       RETURNING *`,
      [uid, experience_years, target_title, work_preference, salary_expectation, top_skills, industry, bio]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/profile/suggested — jobs ranked by profile + CV match
router.get('/suggested', verifyToken, async (req, res) => {
  try {
    const user    = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    const uid     = user.rows[0].id;
    const profile = await db.query('SELECT * FROM seeker_profiles WHERE user_id=$1', [uid]);
    const cv      = await db.query('SELECT parsed_text FROM cvs WHERE user_id=$1 ORDER BY uploaded_at DESC LIMIT 1', [uid]);

    let query = `SELECT j.*, u.name AS employer_name FROM jobs j JOIN users u ON j.employer_id = u.id WHERE j.status='open'`;
    const params = [];

    if (profile.rows.length) {
      const p = profile.rows[0];
      if (p.work_preference && p.work_preference !== 'any') {
        params.push(`%${p.work_preference}%`);
        query += ` AND (j.location ILIKE $${params.length} OR j.job_type ILIKE $${params.length})`;
      }
      if (p.target_title) {
        params.push(`%${p.target_title}%`);
        query += ` AND j.title ILIKE $${params.length}`;
      }
    }
    query += ` ORDER BY j.created_at DESC LIMIT 10`;

    const jobs = await db.query(query, params);

    // Score them if CV exists
    if (cv.rows.length) {
      const cvText = cv.rows[0].parsed_text || '';
      const scored = jobs.rows.map(job => {
        const score = computeMatch(cvText, job.requirements || '');
        return { ...job, match_score: score };
      });
      scored.sort((a, b) => b.match_score - a.match_score);
      return res.json(scored.slice(0, 6));
    }

    res.json(jobs.rows.slice(0, 6));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Saved jobs ────────────────────────────────────────────────
router.post('/save/:jobId', verifyToken, async (req, res) => {
  try {
    const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    await db.query('INSERT INTO saved_jobs (user_id,job_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [user.rows[0].id, req.params.jobId]);
    res.json({ saved: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/save/:jobId', verifyToken, async (req, res) => {
  try {
    const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    await db.query('DELETE FROM saved_jobs WHERE user_id=$1 AND job_id=$2', [user.rows[0].id, req.params.jobId]);
    res.json({ saved: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/saved', verifyToken, async (req, res) => {
  try {
    const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    const result = await db.query(
      `SELECT j.*, u.name AS employer_name FROM saved_jobs s
       JOIN jobs j ON s.job_id = j.id JOIN users u ON j.employer_id = u.id
       WHERE s.user_id=$1 ORDER BY s.saved_at DESC`,
      [user.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Direct messages ───────────────────────────────────────────
router.get('/messages/:userId', verifyToken, async (req, res) => {
  try {
    const me = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    const myId = me.rows[0].id;
    const result = await db.query(
      `SELECT m.*, u.name AS sender_name, u.username AS sender_username
       FROM messages m JOIN users u ON m.sender_id = u.id
       WHERE (m.sender_id=$1 AND m.receiver_id=$2) OR (m.sender_id=$2 AND m.receiver_id=$1)
       ORDER BY m.sent_at ASC`,
      [myId, req.params.userId]
    );
    await db.query('UPDATE messages SET is_read=true WHERE receiver_id=$1 AND sender_id=$2', [myId, req.params.userId]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/messages', verifyToken, async (req, res) => {
  const { receiver_id, content } = req.body;
  try {
    const me = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    const result = await db.query(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES ($1,$2,$3) RETURNING *',
      [me.rows[0].id, receiver_id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Keyword match helper ──────────────────────────────────────
const STOPWORDS = new Set(['a','an','the','and','or','in','on','at','to','for','of','with','is','are','was','be','have','that','this','it','as','from']);
function computeMatch(cvText, requirements) {
  if (!cvText || !requirements) return 0;
  const norm = str => str.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
  const keys = [...new Set(norm(requirements))];
  if (!keys.length) return 0;
  const cvWords = new Set(norm(cvText));
  return Math.round((keys.filter(k => cvWords.has(k)).length / keys.length) * 10000) / 100;
}

// GET /api/profile/company
router.get('/company', verifyToken, async (req, res) => {
  try {
    const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    const result = await db.query('SELECT * FROM company_profiles WHERE user_id=$1', [user.rows[0].id]);
    res.json(result.rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/profile/company
router.post('/company', verifyToken, async (req, res) => {
  const { company_name, industry, location, size, website, description } = req.body;
  try {
    const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    const uid  = user.rows[0].id;
    const result = await db.query(
      `INSERT INTO company_profiles (user_id, company_name, industry, location, size, website, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (user_id) DO UPDATE SET
         company_name=$2, industry=$3, location=$4, size=$5, website=$6, description=$7, updated_at=NOW()
       RETURNING *`,
      [uid, company_name, industry, location, size, website, description]
    );
    // Update display name in users table
    if (company_name) await db.query('UPDATE users SET name=$1 WHERE id=$2', [company_name, uid]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
