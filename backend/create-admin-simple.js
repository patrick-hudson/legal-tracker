#!/usr/bin/env node

/**
 * Create Admin User CLI Tool (Simple version for scripting)
 * Usage: node create-admin-simple.js <username> <password> [email]
 */

import { createDatabase } from './db/index.js';
import { hashPassword } from './auth.js';
import crypto from 'crypto';
import 'dotenv/config';

function clientSideHash(username, password) {
  const PASSWORD_SALT = process.env.PASSWORD_SALT || 'legal-tracker-default-CHANGE-THIS';
  const message = username + ':' + password + ':' + PASSWORD_SALT;
  return crypto.createHash('sha256').update(message).digest('hex');
}

async function main() {
  const [username, password, email] = process.argv.slice(2);

  if (!username || !password) {
    console.error('Usage: node create-admin-simple.js <username> <password> [email]');
    process.exit(1);
  }

  console.log('\n==============================================');
  console.log('   Legal Tracker - Create Admin User');
  console.log('==============================================\n');

  try {
    // Create database connection
    const { adminUsersDb } = await createDatabase();

    // Validate username
    if (username.trim().length < 3) {
      console.error('❌ Error: Username must be at least 3 characters long');
      process.exit(1);
    }

    // Check if username already exists
    const existingUser = adminUsersDb.getByUsername(username.trim());
    if (existingUser) {
      console.error(`❌ Error: Username "${username.trim()}" already exists`);
      process.exit(1);
    }

    // Validate password
    if (password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters long');
      process.exit(1);
    }

    const emailValue = email?.trim() || null;

    // Client-side hash (SHA-256 with salt)
    console.log('🔐 Hashing password (client-side)...');
    const hashedPassword = clientSideHash(username.trim(), password);

    // Server-side hash (bcrypt)
    console.log('🔐 Hashing password (server-side bcrypt)...');
    const passwordHash = await hashPassword(hashedPassword);

    // Create user
    console.log('👤 Creating admin user...');
    const result = adminUsersDb.create(username.trim(), passwordHash, emailValue);

    console.log('\n✅ Success! Admin user created:');
    console.log(`   ID: ${result.id}`);
    console.log(`   Username: ${username.trim()}`);
    if (emailValue) {
      console.log(`   Email: ${emailValue}`);
    }
    console.log('\n✨ You can now log in to the admin portal at /admin');
    console.log('==============================================\n');

  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  }
}

main();
