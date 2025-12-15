-- Legal Tracker Database Schema
-- SQLite database initialization script
-- Creates all required tables for the application
--
-- Usage: sqlite3 data/tracker.db < database-schema.sql
-- Then run: node create-admin-simple.js <username> <password>

-- Settings table for application configuration
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Matters table for legal matter tracking
CREATE TABLE IF NOT EXISTS matters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  matter_date DATETIME NOT NULL,
  note TEXT,
  days_since INTEGER,
  cost REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin users table for portal authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active INTEGER DEFAULT 1
);

-- Admin sessions table for JWT session management
CREATE TABLE IF NOT EXISTS admin_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_jti TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES admin_users(id)
);
