const admin = require('firebase-admin');

if (!admin.apps.length) {
  if (process.env.FIREBASE_SA_KEY) {
    // Production (Render): key stored as base64 env var
    const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SA_KEY, 'base64').toString());
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } else {
    // Local development: use the JSON file
    admin.initializeApp({ credential: admin.credential.cert(require('../serviceAccountKey.json')) });
  }
}

async function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing auth token' });
  }
  const token = header.split(' ')[1];
  try {
    req.user = await admin.auth().verifyIdToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.dbUser?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
