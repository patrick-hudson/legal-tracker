#!/usr/bin/env node

/**
 * Create Admin User CLI Tool
 *
 * Interactive command-line tool to create admin users for the legal tracker admin portal.
 * Usage: node create-admin.js
 */

import { createDatabase } from './db.js';
import { hashPassword } from './auth.js';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import crypto from 'crypto';
import 'dotenv/config';

function clientSideHash(username, password) {
  const PASSWORD_SALT = process.env.PASSWORD_SALT || 'legal-tracker-default-CHANGE-THIS';
  const message = username + ':' + password + ':' + PASSWORD_SALT;
  return crypto.createHash('sha256').update(message).digest('hex');
}

async function main() {
  console.log('\n==============================================');
  console.log('   Legal Tracker - Create Admin User');
  console.log('==============================================\n');

  const rl = readline.createInterface({
    input,
    output,
    terminal: false
  });

  try {
    // Create database connection
    const { adminUsersDb } = await createDatabase();

    // Get username
    const username = await rl.question('Username: ');
    if (!username || username.trim().length < 3) {
      console.error('❌ Error: Username must be at least 3 characters long');
      process.exit(1);
    }

    // Check if username already exists
    const existingUser = adminUsersDb.getByUsername(username.trim());
    if (existingUser) {
      console.error(`❌ Error: Username "${username.trim()}" already exists`);
      process.exit(1);
    }

    // Get email (optional)
    const email = await rl.question('Email (optional, press Enter to skip): ');
    const emailValue = email.trim() || null;

    // Get password (with confirmation)
    console.log('\n⚠️  Password will not be displayed as you type');
    const password = await rl.question('Password: ');
    if (!password || password.length < 8) {
      console.error('❌ Error: Password must be at least 8 characters long');
      process.exit(1);
    }

    const passwordConfirm = await rl.question('Confirm password: ');
    if (password !== passwordConfirm) {
      console.error('❌ Error: Passwords do not match');
      process.exit(1);
    }

    // Client-side hash (SHA-256 with salt)
    console.log('\n🔐 Hashing password (client-side)...');
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
  } finally {
    rl.close();
  }
}

main();
