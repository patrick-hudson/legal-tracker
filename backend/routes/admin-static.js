/**
 * Admin portal static file routes
 * Serves HTML, CSS, and JavaScript for the admin portal
 */

import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Secure file serving helper - prevents path traversal attacks
 * @param {string} baseDir - Base directory relative to admin folder
 * @param {string} file - Filename to serve
 * @returns {string} File contents
 */
function serveStaticFile(baseDir, file) {
  // Sanitize filename - reject any path with .. or absolute paths
  if (file.includes('..') || file.startsWith('/') || file.includes('\0')) {
    throw new Error('Invalid file path');
  }

  // Only allow alphanumeric, dash, underscore, and dot
  if (!/^[a-zA-Z0-9_\-\.]+$/.test(file)) {
    throw new Error('Invalid file name');
  }

  const filePath = join(__dirname, '..', '..', 'admin', baseDir, file);

  // Verify the resolved path is within the expected directory
  const resolvedPath = resolve(filePath);
  const expectedBase = resolve(join(__dirname, '..', '..', 'admin', baseDir));

  if (!resolvedPath.startsWith(expectedBase)) {
    throw new Error('Path traversal attempt detected');
  }

  return readFileSync(resolvedPath, 'utf-8');
}

/**
 * Register admin static file routes
 * @param {import('fastify').FastifyInstance} fastify
 * @param {Object} opts
 */
export default async function adminStaticRoutes(fastify, opts) {
  // Serve admin portal index
  fastify.get('/admin', async (request, reply) => {
    const html = readFileSync(join(__dirname, '..', '..', 'admin', 'index.html'), 'utf-8');
    return reply.type('text/html').send(html);
  });

  fastify.get('/admin/bootstrap.html', async (_request, reply) => {
    const html = readFileSync(join(__dirname, '..', '..', 'admin', 'bootstrap.html'), 'utf-8');
    return reply.type('text/html').send(html);
  });

  // Serve favicon
  fastify.get('/admin/favicon.png', async (_request, reply) => {
    try {
      const favicon = readFileSync(join(__dirname, '..', '..', 'admin', 'favicon.png'));
      reply.header('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      return reply.type('image/png').send(favicon);
    } catch (error) {
      return reply.code(404).send({ error: 'Favicon not found' });
    }
  });

  fastify.get('/admin/css/:file', async (request, reply) => {
    try {
      const css = serveStaticFile('css', request.params.file);
      return reply.type('text/css').send(css);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  fastify.get('/admin/js/:file', async (request, reply) => {
    try {
      const js = serveStaticFile('js', request.params.file);
      // Disable caching for JavaScript files to prevent stale code
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      return reply.type('application/javascript').send(js);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  fastify.get('/admin/js/components/:file', async (request, reply) => {
    try {
      const js = serveStaticFile('js/components', request.params.file);
      // Disable caching for JavaScript files to prevent stale code
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      return reply.type('application/javascript').send(js);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  fastify.get('/admin/js/components/data-management/:file', async (request, reply) => {
    try {
      const js = serveStaticFile('js/components/data-management', request.params.file);
      // Disable caching for JavaScript files to prevent stale code
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      return reply.type('application/javascript').send(js);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  fastify.get('/admin/js/components/security/:file', async (request, reply) => {
    try {
      const js = serveStaticFile('js/components/security', request.params.file);
      // Disable caching for JavaScript files to prevent stale code
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      return reply.type('application/javascript').send(js);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  // Modular component directories (matters, matter-detail)
  fastify.get('/admin/js/components/matters/:file', async (request, reply) => {
    try {
      const js = serveStaticFile('js/components/matters', request.params.file);
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      return reply.type('application/javascript').send(js);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  fastify.get('/admin/js/components/matter-detail/:file', async (request, reply) => {
    try {
      const js = serveStaticFile('js/components/matter-detail', request.params.file);
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      return reply.type('application/javascript').send(js);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });

  // Modular API directory
  fastify.get('/admin/js/api/:file', async (request, reply) => {
    try {
      const js = serveStaticFile('js/api', request.params.file);
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
      return reply.type('application/javascript').send(js);
    } catch (error) {
      fastify.log.warn({ file: request.params.file, error: error.message }, 'Static file access denied');
      return reply.code(404).send({ error: 'File not found' });
    }
  });
}
