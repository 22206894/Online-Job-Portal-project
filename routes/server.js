require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const authRoutes         = require('./routes/auth');
const jobsRoutes         = require('./routes/jobs');
const applicationsRoutes = require('./routes/applications');
const cvRoutes           = require('./routes/cv');
const profileRoutes      = require('./routes/profile');
const adminRoutes        = require('./routes/admin');
const { router: notifRoutes } = require('./routes/notifications');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:3000', 'http://192.168.3.104:5500'],
  credentials: true
}));
app.use(express.json());

// Serve uploaded CV files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/auth',         authRoutes);
app.use('/api/jobs',         jobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/cv',           cvRoutes);
app.use('/api/profile',      profileRoutes);
app.use('/api/admin',         adminRoutes);
app.use('/api/notifications', notifRoutes);

// Serve static frontend from project root
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => {
  console.log(`JobMatch server running on http://localhost:${PORT}`);
});
