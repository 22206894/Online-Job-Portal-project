const express = require('express');
const router  = express.Router();
const db      = require('../db/pool');
const { verifyToken } = require('../middleware/authMiddleware');
const { createNotification } = require('./notifications');

// ── CV matching algorithm ────────────────────────────────────
const STOPWORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with','is',
  'are','was','were','be','been','have','has','that','this','it','as','from'
]);

function normalize(str) {
  return str.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function computeMatchScore(cvText, jobRequirements) {
  if (!cvText || !jobRequirements) return 0;
  const jobKeywords = [...new Set(normalize(jobRequirements))];
  if (!jobKeywords.length) return 0;
  const cvWords = new Set(normalize(cvText));
  const matched = jobKeywords.filter(k => cvWords.has(k)).length;
  return Math.round((matched / jobKeywords.length) * 100 * 100) / 100;
}

function getBreakdown(cvText, jobRequirements) {
  if (!jobRequirements) return { matched: [], missing: [], score: 0 };
  const jobKeywords = [...new Set(normalize(jobRequirements))];
  const cvWords     = new Set(cvText ? normalize(cvText) : []);
  const matched     = jobKeywords.filter(k => cvWords.has(k));
  const missing     = jobKeywords.filter(k => !cvWords.has(k));
  const score       = jobKeywords.length ? Math.round((matched.length / jobKeywords.length) * 100) : 0;
  const perKeyword  = jobKeywords.length ? Math.round(100 / jobKeywords.length) : 0;
  return {
    matched,
    missing: missing.map(k => ({ keyword: k, boost: perKeyword })),
    score,
    total: jobKeywords.length
  };
}

// POST /api/applications/apply — seeker applies to a job
router.post('/apply', verifyToken, async (req, res) => {
  const { job_id } = req.body;
  try {
    const user = await db.query(`SELECT id FROM users WHERE firebase_uid = $1`, [req.user.uid]);
    const seeker_id = user.rows[0].id;

    // Get job requirements
    const job = await db.query(`SELECT requirements FROM jobs WHERE id = $1`, [job_id]);
    if (!job.rows.length) return res.status(404).json({ error: 'Job not found' });

    // Get seeker's most recent CV
    const cv = await db.query(
      `SELECT id, parsed_text FROM cvs WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1`,
      [seeker_id]
    );
    const cv_id      = cv.rows[0]?.id   ?? null;
    const cvText     = cv.rows[0]?.parsed_text ?? '';
    const matchScore = computeMatchScore(cvText, job.rows[0].requirements);

    const jobFull = await db.query('SELECT title, employer_id FROM jobs WHERE id=$1', [job_id]);
    const result = await db.query(
      `INSERT INTO applications (job_id, seeker_id, cv_id, match_score)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (job_id, seeker_id) DO UPDATE SET match_score = EXCLUDED.match_score
       RETURNING *`,
      [job_id, seeker_id, cv_id, matchScore]
    );

    // Notify employer that someone applied
    if (jobFull.rows.length) {
      const jobTitle   = jobFull.rows[0].title;
      const employerId = jobFull.rows[0].employer_id;
      const seeker     = await db.query('SELECT name FROM users WHERE id=$1', [seeker_id]);
      const seekerName = seeker.rows[0]?.name || 'Someone';
      createNotification(
        employerId, 'application',
        'New Application',
        seekerName + ' applied to your job: ' + jobTitle + (matchScore > 0 ? ' — ' + matchScore.toFixed(0) + '% match' : ''),
        '/pages/employer-dashboard.html'
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to apply' });
  }
});

// GET /api/applications/mine — seeker's own applications
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const user = await db.query(`SELECT id FROM users WHERE firebase_uid = $1`, [req.user.uid]);
    const result = await db.query(
      `SELECT a.*, j.title, j.company_name, j.location, j.salary
       FROM applications a JOIN jobs j ON a.job_id = j.id
       WHERE a.seeker_id = $1 ORDER BY a.applied_at DESC`,
      [user.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /api/applications/job/:id — employer sees applicants ranked by score
router.get('/job/:id', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.*, u.name AS seeker_name, u.email AS seeker_email,
              c.file_path AS cv_file_path
       FROM applications a
       JOIN users u ON a.seeker_id = u.id
       LEFT JOIN cvs c ON a.cv_id = c.id
       WHERE a.job_id = $1 ORDER BY a.match_score DESC`,
      [req.params.id]
    );
    const rows = result.rows.map(r => ({
      ...r,
      cv_filename: r.cv_file_path ? require('path').basename(r.cv_file_path) : null
    }));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch applicants' });
  }
});

// PUT /api/applications/:id/status — employer updates application status
router.put('/:id/status', verifyToken, async (req, res) => {
  const { status } = req.body;
  const allowed = ['pending','reviewed','accepted','rejected'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const result = await db.query(
      'UPDATE applications SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Application not found' });

    // Notify seeker of status change
    const app = result.rows[0];
    const job = await db.query('SELECT title FROM jobs WHERE id=$1', [app.job_id]);
    const jobTitle = job.rows[0]?.title || 'a job';
    const messages = {
      reviewed: 'Your application for ' + jobTitle + ' has been reviewed by the employer.',
      accepted: '🎉 Congratulations! Your application for ' + jobTitle + ' has been accepted!',
      rejected: 'Your application for ' + jobTitle + ' was not successful this time. Keep applying!',
    };
    if (messages[status]) {
      createNotification(
        app.seeker_id, 'status_' + status,
        status === 'accepted' ? '🎉 Application Accepted' : status === 'reviewed' ? 'Application Reviewed' : 'Application Update',
        messages[status],
        '/pages/seeker-dashboard.html'
      );
    }

    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/applications/:id/breakdown — employer views keyword breakdown for one applicant
router.get('/:id/breakdown', verifyToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.match_score, c.parsed_text AS cv_text, c.file_path AS cv_file_path,
              j.requirements, j.title AS job_title, u.name AS seeker_name
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       JOIN users u ON a.seeker_id = u.id
       LEFT JOIN cvs c ON a.cv_id = c.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Application not found' });
    const { cv_text, cv_file_path, requirements, job_title, seeker_name, match_score } = result.rows[0];
    const breakdown = getBreakdown(cv_text, requirements);
    res.json({
      ...breakdown,
      job_title,
      seeker_name,
      match_score,
      cv_filename: cv_file_path ? require('path').basename(cv_file_path) : null
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/applications/breakdown/:jobId — CV keyword breakdown for a job
router.get('/breakdown/:jobId', verifyToken, async (req, res) => {
  try {
    const user = await db.query('SELECT id FROM users WHERE firebase_uid=$1', [req.user.uid]);
    const uid  = user.rows[0].id;
    const job  = await db.query('SELECT requirements, title FROM jobs WHERE id=$1', [req.params.jobId]);
    if (!job.rows.length) return res.status(404).json({ error: 'Job not found' });
    const cv = await db.query('SELECT parsed_text FROM cvs WHERE user_id=$1 ORDER BY uploaded_at DESC LIMIT 1', [uid]);
    const cvText = cv.rows[0]?.parsed_text || '';
    const breakdown = getBreakdown(cvText, job.rows[0].requirements);
    res.json({ ...breakdown, hasCv: !!cv.rows.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/applications/similar/:jobId — similar jobs based on requirements
router.get('/similar/:jobId', async (req, res) => {
  try {
    const job = await db.query('SELECT requirements, title FROM jobs WHERE id=$1', [req.params.jobId]);
    if (!job.rows.length) return res.json([]);
    const words = (job.rows[0].requirements || job.rows[0].title || '').split(' ').slice(0, 5).join(' | ');
    const result = await db.query(
      `SELECT j.*, u.name AS employer_name FROM jobs j JOIN users u ON j.employer_id = u.id
       WHERE j.status='open' AND j.id != $1
         AND (j.requirements ILIKE $2 OR j.title ILIKE $3)
       LIMIT 4`,
      [req.params.jobId, `%${words.split(' | ')[0]}%`, `%${job.rows[0].title.split(' ')[0]}%`]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
