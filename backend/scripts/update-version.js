#!/usr/bin/env node

/**
 * Version Management Script
 * Updates version across all project files following semantic versioning
 *
 * Usage:
 *   node scripts/update-version.js [patch|minor|major]
 *   npm run version:patch  - Bug fixes (0.1.0 -> 0.1.1)
 *   npm run version:minor  - New features (0.1.0 -> 0.2.0)
 *   npm run version:major  - Breaking changes (0.1.0 -> 1.0.0)
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..', '..');

function getCurrentVersion() {
  const versionFile = join(rootDir, 'VERSION');
  return readFileSync(versionFile, 'utf8').trim();
}

function parseVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return { major, minor, patch };
}

function incrementVersion(current, type) {
  const version = parseVersion(current);

  switch (type) {
    case 'major':
      version.major += 1;
      version.minor = 0;
      version.patch = 0;
      break;
    case 'minor':
      version.minor += 1;
      version.patch = 0;
      break;
    case 'patch':
      version.patch += 1;
      break;
    default:
      console.error('Invalid version type. Use: patch, minor, or major');
      process.exit(1);
  }

  return `${version.major}.${version.minor}.${version.patch}`;
}

function updateFile(filePath, searchPattern, replaceWith) {
  try {
    const content = readFileSync(filePath, 'utf8');
    const updated = content.replace(searchPattern, replaceWith);

    if (content !== updated) {
      writeFileSync(filePath, updated, 'utf8');
      console.log(`✓ Updated ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`✗ Error updating ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  const type = process.argv[2];

  if (!type) {
    console.error('Usage: node scripts/update-version.js [patch|minor|major]');
    process.exit(1);
  }

  const currentVersion = getCurrentVersion();
  const newVersion = incrementVersion(currentVersion, type);

  console.log(`\nUpdating version: ${currentVersion} → ${newVersion} (${type})\n`);

  // Update VERSION file
  writeFileSync(join(rootDir, 'VERSION'), newVersion, 'utf8');
  console.log(`✓ Updated VERSION`);

  // Update package.json
  updateFile(
    join(rootDir, 'backend', 'package.json'),
    /"version":\s*"[^"]+"/,
    `"version": "${newVersion}"`
  );

  // Update README.md
  updateFile(
    join(rootDir, 'README.md'),
    /LEGAL MATTER v[\d.]+/,
    `LEGAL MATTER v${newVersion}`
  );

  // Update frontend app.js
  const appJsPath = join(rootDir, 'frontend', 'app.js');
  const appJsContent = readFileSync(appJsPath, 'utf8');
  const updatedAppJs = appJsContent.replace(
    /v[\d.]+ •/,
    `v${newVersion} •`
  );
  writeFileSync(appJsPath, updatedAppJs, 'utf8');
  console.log(`✓ Updated frontend/app.js`);

  console.log(`\n✅ Version updated to ${newVersion}`);
  console.log(`\nNext steps:`);
  console.log(`  git add -A`);
  console.log(`  git commit -m "Release version ${newVersion}"`);
  console.log(`  git tag v${newVersion}`);
  console.log(`  git push && git push --tags`);
}

main();
