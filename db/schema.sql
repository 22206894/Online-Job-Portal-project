-- JobMatch Database Schema
-- Run this on your Neon (or any PostgreSQL) database to create all tables.
-- Neon: open the SQL Editor tab and paste this file, then click Run.

-- Users (Firebase auth maps to this table)
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  firebase_uid VARCHAR(128) UNIQUE NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  name         VARCHAR(255),
  username     VARCHAR(100) UNIQUE,
  role         VARCHAR(20) NOT NULL DEFAULT 'seeker'
                 CHECK (role IN ('seeker', 'employer', 'admin')),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Jobs posted by employers
CREATE TABLE IF NOT EXISTS jobs (
  id           SERIAL PRIMARY KEY,
  employer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  requirements TEXT,
  location     VARCHAR(255),
  salary       VARCHAR(100),
  job_type     VARCHAR(50) DEFAULT 'full-time',
  company_name VARCHAR(255),
  status       VARCHAR(20) NOT NULL DEFAULT 'open'
                 CHECK (status IN ('open', 'closed', 'pending')),
  created_at   TIMESTAMP DEFAULT NOW()
);

-- Uploaded CVs (PDF text stored for matching)
CREATE TABLE IF NOT EXISTS cvs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_path   VARCHAR(500) NOT NULL,
  parsed_text TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Job applications
CREATE TABLE IF NOT EXISTS applications (
  id          SERIAL PRIMARY KEY,
  job_id      INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  seeker_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cv_id       INTEGER REFERENCES cvs(id),
  match_score NUMERIC(5,2) DEFAULT 0,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  applied_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (job_id, seeker_id)
);

-- Seeker career profiles
CREATE TABLE IF NOT EXISTS seeker_profiles (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_title       VARCHAR(255),
  experience_years   INTEGER DEFAULT 0,
  work_preference    VARCHAR(50) DEFAULT 'any',
  salary_expectation VARCHAR(100),
  top_skills         TEXT,
  industry           VARCHAR(100),
  bio                TEXT,
  updated_at         TIMESTAMP DEFAULT NOW()
);

-- Employer company profiles
CREATE TABLE IF NOT EXISTS company_profiles (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_name VARCHAR(255),
  industry     VARCHAR(100),
  location     VARCHAR(255),
  size         VARCHAR(50),
  website      VARCHAR(500),
  description  TEXT,
  updated_at   TIMESTAMP DEFAULT NOW()
);

-- Saved jobs (seeker bookmarks)
CREATE TABLE IF NOT EXISTS saved_jobs (
  id       SERIAL PRIMARY KEY,
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id   INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  saved_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT,
  link       VARCHAR(500),
  is_read    BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Direct messages between users
CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  sent_at     TIMESTAMP DEFAULT NOW()
);
