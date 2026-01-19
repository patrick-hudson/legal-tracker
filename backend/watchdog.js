/**
 * Watchdog Process Manager
 *
 * A lightweight process manager that monitors and controls the main server.
 * Provides HTTP endpoints for status, restart, and file change detection.
 *
 * Usage: node watchdog.js
 *
 * Environment variables:
 *   WATCHDOG_PORT - Port for watchdog API (default: 3001)
 *   WATCHDOG_HOST - Host/IP to bind watchdog API (default: 0.0.0.0)
 *   WATCHDOG_API_KEY - API key for restart endpoint (default: from .env or generated)
 *   SERVER_PORT - Port for main server (default: 3000)
 */

import { spawn } from 'child_process';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { statSync, readdirSync, readFileSync } from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env') });

const WATCHDOG_PORT = process.env.WATCHDOG_PORT || 3001;
const WATCHDOG_HOST = process.env.WATCHDOG_HOST || '0.0.0.0';
const WATCHDOG_API_KEY = process.env.WATCHDOG_API_KEY || process.env.API_KEY || 'watchdog-dev-key';
const SERVER_PORT = process.env.PORT || 3000;

// Directories to watch for changes
const WATCH_DIRS = [
  join(__dirname),
  join(__dirname, '..', 'frontend'),
  join(__dirname, '..', 'admin')
];

// Extensions to track
const WATCH_EXTENSIONS = ['.js', '.css', '.html', '.json'];

// Ignore patterns
const IGNORE_PATTERNS = ['node_modules', '.git', 'data', 'uploads', '*.db'];

let serverProcess = null;
let serverStartTime = null;
let lastRestartTime = null;
let lastRestartReason = null;
let restartCount = 0;
let fileSnapshotTime = null;
let fileSnapshot = new Map(); // path -> mtime
let intentionalRestart = false; // Track when we're intentionally restarting

// Note: Watchdog does NOT connect to the database directly.
// This prevents the watchdog and server from having separate in-memory
// copies of the SQLite database that overwrite each other on save.
// The server will log its own startup/restart events.

/**
 * Check if a path should be ignored
 */
function shouldIgnore(filePath) {
  return IGNORE_PATTERNS.some(pattern => {
    if (pattern.startsWith('*')) {
      return filePath.endsWith(pattern.slice(1));
    }
    return filePath.includes(pattern);
  });
}

/**
 * Get all tracked files with their modification times
 */
function getFileSnapshot() {
  const files = new Map();

  function scanDir(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        if (shouldIgnore(fullPath)) continue;

        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile()) {
          const ext = fullPath.slice(fullPath.lastIndexOf('.'));
          if (WATCH_EXTENSIONS.includes(ext)) {
            try {
              const stat = statSync(fullPath);
              files.set(fullPath, stat.mtimeMs);
            } catch {
              // File may have been deleted
            }
          }
        }
      }
    } catch {
      // Directory may not exist
    }
  }

  for (const dir of WATCH_DIRS) {
    scanDir(dir);
  }

  return files;
}

/**
 * Get list of files modified since last snapshot
 */
function getModifiedFiles() {
  if (!fileSnapshotTime) return [];

  const current = getFileSnapshot();
  const modified = [];

  // Check for modified or new files
  for (const [path, mtime] of current) {
    const oldMtime = fileSnapshot.get(path);
    if (!oldMtime || mtime > oldMtime) {
      modified.push({
        path: path.replace(__dirname + '/', '').replace(__dirname + '/../', ''),
        type: oldMtime ? 'modified' : 'new'
      });
    }
  }

  // Check for deleted files
  for (const [path] of fileSnapshot) {
    if (!current.has(path)) {
      modified.push({
        path: path.replace(__dirname + '/', '').replace(__dirname + '/../', ''),
        type: 'deleted'
      });
    }
  }

  return modified;
}

/**
 * Take a snapshot of current file state
 */
function takeSnapshot() {
  fileSnapshot = getFileSnapshot();
  fileSnapshotTime = Date.now();
}

/**
 * Start the main server process
 */
function startServer() {
  if (serverProcess) {
    console.log('[watchdog] Server already running');
    return;
  }

  console.log('[watchdog] Starting server...');

  serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env, PORT: SERVER_PORT }
  });

  serverStartTime = Date.now();

  serverProcess.on('exit', (code, signal) => {
    console.log(`[watchdog] startServer exit handler: code=${code}, signal=${signal}`);
    serverProcess = null;
    serverStartTime = null;

    // Don't auto-restart if this was an intentional restart (handled by restartServer)
    // or if killed by SIGTERM/SIGINT/SIGKILL (graceful shutdown, including force kill after timeout)
    const wasIntentional = intentionalRestart || signal === 'SIGTERM' || signal === 'SIGINT' || signal === 'SIGKILL' || code === 0;
    intentionalRestart = false; // Reset flag

    if (!wasIntentional) {
      console.log('[watchdog] Server crashed, restarting in 2 seconds...');
      setTimeout(() => {
        restartCount++;
        lastRestartTime = Date.now();
        lastRestartReason = `crash (exit code: ${code})`;
        startServer();
        takeSnapshot();
      }, 2000);
    }
  });

  serverProcess.on('error', (err) => {
    console.error('[watchdog] Failed to start server:', err.message);
    serverProcess = null;
    serverStartTime = null;
  });
}

/**
 * Stop the main server process
 */
function stopServer() {
  return new Promise((resolve) => {
    if (!serverProcess) {
      console.log('[watchdog] stopServer: no process to stop');
      resolve();
      return;
    }

    console.log('[watchdog] Stopping server...');

    const proc = serverProcess; // Capture reference before it gets nulled

    console.log('[watchdog] stopServer: registering exit handler on proc');
    proc.once('exit', (code, signal) => {
      console.log(`[watchdog] stopServer exit handler: code=${code}, signal=${signal}, resolving promise`);
      serverProcess = null;
      serverStartTime = null;
      resolve();
    });

    console.log('[watchdog] stopServer: sending SIGTERM');
    proc.kill('SIGTERM');

    // Force kill after 5 seconds
    setTimeout(() => {
      // Use proc (captured reference) not serverProcess (might be nulled)
      try {
        if (!proc.killed) {
          console.log('[watchdog] Force killing server with SIGKILL...');
          proc.kill('SIGKILL');
        } else {
          console.log('[watchdog] Timeout fired but process already killed');
        }
      } catch (err) {
        console.log(`[watchdog] Force kill error: ${err.message}`);
      }
    }, 5000);
  });
}

/**
 * Restart the main server process
 */
async function restartServer(reason = 'manual') {
  restartCount++;
  lastRestartTime = Date.now();
  lastRestartReason = reason;
  intentionalRestart = true; // Mark this as intentional so exit handler doesn't treat it as crash

  console.log(`[watchdog] Restarting server: ${reason}`);

  try {
    await stopServer();
    console.log('[watchdog] stopServer completed, calling startServer...');
    startServer();
    takeSnapshot();
  } catch (err) {
    console.error('[watchdog] Error in restartServer:', err);
    // Try to start anyway
    startServer();
    takeSnapshot();
  }
}

/**
 * Format uptime as human-readable string
 */
function formatUptime(ms) {
  if (!ms) return 'not running';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

/**
 * Handle HTTP requests
 */
function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${WATCHDOG_PORT}`);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Status endpoint - no auth required
  if (url.pathname === '/status' && req.method === 'GET') {
    const uptime = serverStartTime ? Date.now() - serverStartTime : 0;
    const modifiedFiles = getModifiedFiles();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      running: !!serverProcess,
      uptime,
      uptimeFormatted: formatUptime(uptime),
      serverPort: SERVER_PORT,
      restartCount,
      lastRestartTime,
      lastRestartReason,
      pendingChanges: modifiedFiles.length,
      modifiedFiles: modifiedFiles.slice(0, 20)
    }));
    return;
  }

  // Restart endpoint - requires auth
  if (url.pathname === '/restart' && req.method === 'POST') {
    const apiKey = req.headers['x-api-key'];

    if (apiKey !== WATCHDOG_API_KEY) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      let reason = 'manual';
      try {
        const data = JSON.parse(body);
        reason = data.reason || 'manual';
      } catch {
        // Use default reason
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        message: 'Restart initiated',
        reason
      }));

      // Restart after response is sent
      setTimeout(() => restartServer(reason), 100);
    });
    return;
  }

  // Changes endpoint - no auth required
  if (url.pathname === '/changes' && req.method === 'GET') {
    const modifiedFiles = getModifiedFiles();

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      snapshotTime: fileSnapshotTime,
      count: modifiedFiles.length,
      files: modifiedFiles
    }));
    return;
  }

  // 404 for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Main entry point
 */
async function main() {
  console.log(`
[watchdog] Legal Matters Process Manager
[watchdog] ================================
[watchdog] Watchdog API: http://${WATCHDOG_HOST}:${WATCHDOG_PORT}
[watchdog] Server will run on port: ${SERVER_PORT}
[watchdog] API Key configured: ${WATCHDOG_API_KEY ? 'yes' : 'no'}
`);

  // Take initial file snapshot
  takeSnapshot();
  console.log(`[watchdog] Tracking ${fileSnapshot.size} files for changes`);

  // Start HTTP server for watchdog API
  const httpServer = createServer(handleRequest);
  httpServer.listen(WATCHDOG_PORT, WATCHDOG_HOST, () => {
    console.log(`[watchdog] API listening on ${WATCHDOG_HOST}:${WATCHDOG_PORT}`);
  });

  // Start the main server
  startServer();

  // Handle shutdown gracefully
  process.on('SIGINT', async () => {
    console.log('\n[watchdog] Shutting down...');
    await stopServer();
    httpServer.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[watchdog] Shutting down...');
    await stopServer();
    httpServer.close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('[watchdog] Fatal error:', err);
  process.exit(1);
});
