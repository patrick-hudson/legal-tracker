/**
 * Backup and Restore Module
 * Creates and restores ZIP backups of database and attachments
 */

import archiver from 'archiver';
import AdmZip from 'adm-zip';
import { Readable, PassThrough } from 'stream';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Backup format version
const BACKUP_VERSION = '1.0';

// Settings to exclude from backup (environment-specific)
const EXCLUDED_SETTINGS = [
  'claude_api_key',
  'ai_selected_model',
  'ai_spice_level',
  'ai_custom_prompt',
  // Per-type AI settings
  'ai_spice_matters',
  'ai_spice_notes',
  'ai_spice_attachments',
  'ai_spice_audit_log',
  'ai_prompt_matters',
  'ai_prompt_notes',
  'ai_prompt_attachments',
  'ai_prompt_audit_log'
];

/**
 * Get app version from package.json
 */
function getAppVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
    return pkg.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Create a backup ZIP archive
 * @param {Object} db - Database helpers object
 * @param {Object} storage - Storage instance
 * @param {Object} options - Backup options
 * @param {boolean} options.includeAttachments - Include attachment files
 * @param {boolean} options.includeAuditLog - Include audit log entries
 * @param {string} options.s3Mode - 'full' or 'references' (for S3 storage)
 * @param {Object} context - User context for logging
 * @returns {Promise<{ stream: PassThrough, filename: string }>}
 */
export async function createBackup(db, storage, options = {}, context = {}) {
  const {
    includeAttachments = true,
    includeAuditLog = false,
    s3Mode = 'full'
  } = options;

  const {
    settingsDb,
    mattersDb,
    privateNotesDb,
    attachmentsDb,
    adminUsersDb,
    auditLogDb
  } = db;

  // Get current storage backend
  const storageBackend = settingsDb.get('storage_backend') || 'filesystem';

  // Collect database data
  const allSettings = settingsDb.getAll();
  const filteredSettings = Object.fromEntries(
    Object.entries(allSettings).filter(([key]) => !EXCLUDED_SETTINGS.includes(key))
  );

  const matters = mattersDb.getAll();
  const privateNotes = privateNotesDb.getAll();
  const attachments = attachmentsDb.getAll();
  const users = adminUsersDb.getAllWithHashes();

  // Optionally include audit log
  let auditLog = [];
  if (includeAuditLog) {
    const { entries } = auditLogDb.getAll({ limit: 1000000 }); // Get all entries
    auditLog = entries;
  }

  // Build database export
  const databaseExport = {
    settings: filteredSettings,
    matters,
    private_notes: privateNotes,
    attachments,
    admin_users: users,
    audit_log: auditLog
  };

  // Calculate attachment total size
  const attachmentTotalSize = attachments.reduce((sum, a) => sum + (a.size_bytes || 0), 0);

  // Build manifest
  const manifest = {
    version: BACKUP_VERSION,
    created_at: new Date().toISOString(),
    app_version: getAppVersion(),
    storage_backend: storageBackend,
    options: {
      include_attachments: includeAttachments,
      include_audit_log: includeAuditLog,
      s3_mode: storageBackend === 's3' ? s3Mode : null
    },
    counts: {
      matters: matters.length,
      private_notes: privateNotes.length,
      attachments: attachments.length,
      audit_log_entries: auditLog.length,
      users: users.length,
      settings: Object.keys(filteredSettings).length
    },
    attachment_total_size: attachmentTotalSize
  };

  // Create ZIP archive
  const archive = archiver('zip', { zlib: { level: 6 } });
  const passThrough = new PassThrough();

  archive.pipe(passThrough);

  // Add manifest
  archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

  // Add database export
  archive.append(JSON.stringify(databaseExport, null, 2), { name: 'database.json' });

  // Add attachment files if requested
  if (includeAttachments && attachments.length > 0) {
    const shouldDownloadFiles = storageBackend !== 's3' || s3Mode === 'full';

    if (shouldDownloadFiles) {
      for (const attachment of attachments) {
        try {
          const { stream } = await storage.getObjectStream(attachment.storage_key, context);
          archive.append(stream, { name: `attachments/${attachment.storage_key}` });
        } catch (err) {
          console.warn(`Failed to include attachment ${attachment.storage_key}: ${err.message}`);
          // Continue with other files
        }
      }
    }
    // For S3 references mode, files are not included - metadata in database.json is enough
  }

  // Finalize archive
  archive.finalize();

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup-${timestamp}.zip`;

  return { stream: passThrough, filename };
}

/**
 * Validate and preview a backup ZIP
 * @param {Buffer} zipBuffer - ZIP file buffer
 * @param {Object} db - Database helpers for comparison
 * @returns {Object} Preview data with counts and warnings
 */
export function previewBackup(zipBuffer, db = null) {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  // Check required files
  const manifestEntry = entries.find(e => e.entryName === 'manifest.json');
  const databaseEntry = entries.find(e => e.entryName === 'database.json');

  if (!manifestEntry) {
    throw new Error('Invalid backup: missing manifest.json');
  }
  if (!databaseEntry) {
    throw new Error('Invalid backup: missing database.json');
  }

  // Parse manifest
  let manifest;
  try {
    manifest = JSON.parse(manifestEntry.getData().toString('utf-8'));
  } catch {
    throw new Error('Invalid backup: manifest.json is not valid JSON');
  }

  // Validate manifest structure
  if (!manifest.version || !manifest.created_at || !manifest.counts) {
    throw new Error('Invalid backup: manifest.json is missing required fields');
  }

  // Parse database to validate structure
  let database;
  try {
    database = JSON.parse(databaseEntry.getData().toString('utf-8'));
  } catch {
    throw new Error('Invalid backup: database.json is not valid JSON');
  }

  // Validate database structure
  const requiredTables = ['settings', 'matters', 'private_notes', 'attachments', 'admin_users'];
  for (const table of requiredTables) {
    if (!(table in database)) {
      throw new Error(`Invalid backup: database.json is missing "${table}" table`);
    }
  }

  // Count attachment files in ZIP
  const attachmentFiles = entries.filter(e => e.entryName.startsWith('attachments/'));
  const hasAttachmentFiles = attachmentFiles.length > 0;

  // Build warnings
  const warnings = [];

  // Check for version mismatch
  const currentVersion = getAppVersion();
  if (manifest.app_version !== currentVersion) {
    warnings.push({
      type: 'version_mismatch',
      message: `Backup was created with version ${manifest.app_version}, current version is ${currentVersion}`
    });
  }

  // Check for storage backend mismatch if db is provided
  if (db) {
    const currentBackend = db.settingsDb.get('storage_backend') || 'filesystem';
    if (manifest.storage_backend !== currentBackend) {
      warnings.push({
        type: 'storage_mismatch',
        message: `Backup used ${manifest.storage_backend} storage, current system uses ${currentBackend}`,
        backup_backend: manifest.storage_backend,
        current_backend: currentBackend
      });
    }
  }

  // Check for S3 references mode without files
  if (manifest.options?.s3_mode === 'references' && !hasAttachmentFiles && manifest.counts.attachments > 0) {
    warnings.push({
      type: 's3_references',
      message: 'Backup contains S3 references only, attachment files are not included. Files must exist in S3 bucket for restore.'
    });
  }

  // Check for missing attachment files
  if (manifest.options?.include_attachments && manifest.counts.attachments > 0) {
    const expectedFiles = database.attachments.length;
    if (hasAttachmentFiles && attachmentFiles.length < expectedFiles) {
      warnings.push({
        type: 'missing_files',
        message: `Backup contains ${attachmentFiles.length} files but metadata shows ${expectedFiles} attachments`
      });
    }
  }

  return {
    valid: true,
    manifest,
    counts: manifest.counts,
    attachment_total_size: manifest.attachment_total_size,
    has_attachment_files: hasAttachmentFiles,
    attachment_file_count: attachmentFiles.length,
    warnings
  };
}

/**
 * Restore a backup ZIP
 * @param {Buffer} zipBuffer - ZIP file buffer
 * @param {Object} db - Database helpers object
 * @param {Object} storage - Storage instance
 * @param {Function} resetAllSequences - Function to reset ID sequences
 * @param {Object} context - User context for logging
 * @returns {Promise<Object>} Restore result
 */
export async function restoreBackup(zipBuffer, db, storage, resetAllSequences, context = {}) {
  const {
    settingsDb,
    mattersDb,
    privateNotesDb,
    attachmentsDb,
    adminUsersDb,
    adminSessionsDb,
    auditLogDb,
    saveDatabase
  } = db;

  // Validate backup first
  const preview = previewBackup(zipBuffer, db);
  if (!preview.valid) {
    throw new Error('Invalid backup file');
  }

  const zip = new AdmZip(zipBuffer);

  // Parse database.json
  const databaseEntry = zip.getEntry('database.json');
  const database = JSON.parse(databaseEntry.getData().toString('utf-8'));

  // Get current storage backend
  const currentBackend = settingsDb.get('storage_backend') || 'filesystem';
  const backupBackend = preview.manifest.storage_backend;

  // Determine if we can restore attachment files
  const canRestoreFiles = preview.has_attachment_files ||
    (backupBackend === 's3' && preview.manifest.options?.s3_mode === 'references' && currentBackend === 's3');

  // Check for impossible restore scenario
  if (!preview.has_attachment_files && preview.manifest.options?.s3_mode === 'references' && currentBackend !== 's3') {
    throw new Error('Cannot restore: backup contains S3 references only but current storage is not S3');
  }

  const result = {
    success: true,
    restored: {
      settings: 0,
      matters: 0,
      private_notes: 0,
      attachments: 0,
      attachment_files: 0,
      users: 0,
      audit_log: 0
    },
    errors: [],
    warnings: preview.warnings
  };

  try {
    // Step 1: Delete existing attachment files from storage
    const existingAttachments = attachmentsDb.getAll();
    for (const attachment of existingAttachments) {
      try {
        await storage.deleteObject(attachment.storage_key, context);
      } catch (err) {
        // Log but continue - file might not exist
        console.warn(`Failed to delete existing attachment ${attachment.storage_key}: ${err.message}`);
      }
    }

    // Step 2: Clear all tables
    auditLogDb.deleteAll();
    attachmentsDb.deleteAll();
    privateNotesDb.deleteAll();
    // Don't use mattersDb.delete() loop - use direct SQL
    db.db.run('DELETE FROM matters');
    adminSessionsDb.invalidateAll();
    adminUsersDb.deleteAll();
    // Clear settings except storage backend (we need it for restore)
    db.db.run('DELETE FROM settings WHERE key != ?', ['storage_backend']);

    // Reset ID sequences
    resetAllSequences();

    // Step 3: Restore settings
    for (const [key, value] of Object.entries(database.settings)) {
      // Skip storage_backend - keep current setting
      if (key === 'storage_backend') continue;
      settingsDb.set(key, value);
      result.restored.settings++;
    }

    // Step 4: Restore admin users (with password hashes)
    for (const user of database.admin_users) {
      db.db.run(`
        INSERT INTO admin_users (id, username, password_hash, email, created_at, last_login, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [user.id, user.username, user.password_hash, user.email, user.created_at, user.last_login, user.is_active]);
      result.restored.users++;
    }

    // Step 5: Restore matters
    for (const matter of database.matters) {
      db.db.run(`
        INSERT INTO matters (id, matter_date, note, days_since, cost, lawyer_name, lawyer_firm, opposing_counsel_name, opposing_counsel_firm, case_number, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        matter.id, matter.matter_date, matter.note, matter.days_since, matter.cost,
        matter.lawyer_name, matter.lawyer_firm, matter.opposing_counsel_name, matter.opposing_counsel_firm,
        matter.case_number, matter.created_at
      ]);
      result.restored.matters++;
    }

    // Step 6: Restore private notes
    for (const note of database.private_notes) {
      db.db.run(`
        INSERT INTO private_notes (id, matter_id, note_content, interaction_date, interaction_type, created_by_user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        note.id, note.matter_id, note.note_content, note.interaction_date, note.interaction_type,
        note.created_by_user_id, note.created_at, note.updated_at
      ]);
      result.restored.private_notes++;
    }

    // Step 7: Restore attachment metadata and files
    for (const attachment of database.attachments) {
      // Determine storage backend for restored attachment
      const restoredBackend = currentBackend;

      // Insert attachment metadata
      db.db.run(`
        INSERT INTO matter_attachments (id, matter_id, original_filename, content_type, size_bytes, storage_backend, storage_key, document_date, direction, created_at, created_by_user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        attachment.id, attachment.matter_id, attachment.original_filename, attachment.content_type,
        attachment.size_bytes, restoredBackend, attachment.storage_key, attachment.document_date,
        attachment.direction, attachment.created_at, attachment.created_by_user_id
      ]);
      result.restored.attachments++;

      // Restore attachment file
      if (preview.has_attachment_files) {
        const fileEntry = zip.getEntry(`attachments/${attachment.storage_key}`);
        if (fileEntry) {
          try {
            const fileBuffer = fileEntry.getData();
            await storage.putObject(
              fileBuffer,
              attachment.original_filename,
              { contentType: attachment.content_type },
              context
            );
            result.restored.attachment_files++;
          } catch (err) {
            result.errors.push(`Failed to restore file ${attachment.storage_key}: ${err.message}`);
          }
        } else {
          result.errors.push(`File missing from backup: ${attachment.storage_key}`);
        }
      }
      // For S3 references mode to S3: files should already exist in bucket
    }

    // Step 8: Restore audit log (if included)
    if (database.audit_log && database.audit_log.length > 0) {
      for (const entry of database.audit_log) {
        db.db.run(`
          INSERT INTO audit_log (id, timestamp, level, user_id, username, action_type, entity_type, entity_id, summary, request, response, details, ip_address, duration_ms, stack_trace)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          entry.id, entry.timestamp, entry.level, entry.user_id, entry.username,
          entry.action_type, entry.entity_type, entry.entity_id, entry.summary,
          entry.request ? JSON.stringify(entry.request) : null,
          entry.response ? JSON.stringify(entry.response) : null,
          entry.details ? JSON.stringify(entry.details) : null,
          entry.ip_address, entry.duration_ms, entry.stack_trace
        ]);
        result.restored.audit_log++;
      }
    }

    // Step 9: Save database
    saveDatabase();

    // Step 10: Log restore action
    auditLogDb.create({
      level: 'INFO',
      user_id: context.userId,
      username: context.username,
      action_type: 'restore',
      entity_type: 'backup',
      summary: `Restored backup from ${preview.manifest.created_at}: ${result.restored.matters} matters, ${result.restored.users} users`,
      details: result
    });

    // Step 11: Invalidate all sessions (force re-login)
    adminSessionsDb.invalidateAll();

    result.redirect_to_login = true;

  } catch (err) {
    result.success = false;
    result.errors.push(`Restore failed: ${err.message}`);
    throw err;
  }

  return result;
}

/**
 * Get current backup statistics
 * @param {Object} db - Database helpers
 * @param {Object} storage - Storage instance
 * @returns {Object} Stats for UI display
 */
export function getBackupStats(db, storage) {
  const {
    settingsDb,
    mattersDb,
    privateNotesDb,
    attachmentsDb,
    adminUsersDb,
    auditLogDb
  } = db;

  const attachments = attachmentsDb.getAll();
  const attachmentSize = attachments.reduce((sum, a) => sum + (a.size_bytes || 0), 0);

  return {
    storage_backend: settingsDb.get('storage_backend') || 'filesystem',
    counts: {
      matters: mattersDb.getStats().total,
      private_notes: privateNotesDb.getAll().length,
      attachments: attachments.length,
      audit_log: auditLogDb.getCount(),
      users: adminUsersDb.getCount()
    },
    attachment_total_size: attachmentSize
  };
}
