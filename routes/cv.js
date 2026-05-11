const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const pdfParse = require('pdf-parse');
const path     = require('path');
const db       = require('../db/pool');
const { verifyToken } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '../uploads'),
  filename: (_req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// POST /api/cv/upload — seeker uploads their PDF CV
router.post('/upload', verifyToken, upload.single('cv'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No PDF file uploaded' });
  try {
    const user = await db.query(`SELECT id FROM users WHERE firebase_uid = $1`, [req.user.uid]);
    const userId = user.rows[0].id;

    const pdfData   = await pdfParse(req.file.path);
    const parsedText = pdfData.text;

    const result = await db.query(
      `INSERT INTO cvs (user_id, file_path, parsed_text)
       VALUES ($1,$2,$3) RETURNING id, uploaded_at`,
      [userId, req.file.path, parsedText]
    );
    res.status(201).json({ ...result.rows[0], message: 'CV uploaded and parsed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'CV upload failed' });
  }
});

module.exports = router;
