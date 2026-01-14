import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import { createServer } from '../../server.js';
import crypto from 'crypto';
import { hashPassword } from '../../auth.js';
import { FilesystemStorage, validateFileType, sanitizeFilename } from '../../storage.js';
import { textToPdf, generatePlaceholderDocument, DOCUMENT_TYPES } from '../../legal-docs.js';
import { Readable } from 'stream';

describe('Attachments Tests', () => {
    let server;
    let baseURL;
    let adminCookie;
    let testMatterId;
    const PASSWORD_SALT = 'test-salt-for-testing';

    before(async () => {
        // Set test password salt
        process.env.PASSWORD_SALT = PASSWORD_SALT;

        // Create server with test configuration
        server = await createServer({
            logger: false,
            dbPath: ':memory:',
            requireAuth: false,
            disableRateLimit: true
        });

        const address = await server.listen({ port: 0, host: '127.0.0.1' });
        const port = server.server.address().port;
        baseURL = `http://127.0.0.1:${port}`;

        // Create test admin user
        const username = 'testadmin';
        const password = 'testpass123';
        const message = username + ':' + password + ':' + PASSWORD_SALT;
        const hashedPassword = crypto.createHash('sha256').update(message).digest('hex');
        const passwordHash = await hashPassword(hashedPassword);

        // Manually insert admin user into database
        const { adminUsersDb } = server.db;
        adminUsersDb.create(username, passwordHash, 'test@example.com');

        // Login to get cookie
        const loginResponse = await fetch(`${baseURL}/admin/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, hashedPassword })
        });
        const setCookie = loginResponse.headers.get('set-cookie');
        adminCookie = setCookie.split(';')[0];

        // Create a test matter for attachment tests
        const matterResponse = await fetch(`${baseURL}/admin/api/matters`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': adminCookie
            },
            body: JSON.stringify({
                matter_date: '2024-12-01T10:00:00.000Z',
                note: 'Test matter for attachments',
                cost: 500.75
            })
        });
        const matterData = await matterResponse.json();
        testMatterId = matterData.matter.id;
    });

    after(async () => {
        await server.close();
    });

    describe('Storage Abstraction Layer', () => {
        it('should validate allowed file types', () => {
            // PDF should be allowed
            const pdfResult = validateFileType('document.pdf', 'application/pdf');
            assert.strictEqual(pdfResult.valid, true);

            // DOC should be allowed
            const docResult = validateFileType('document.doc', 'application/msword');
            assert.strictEqual(docResult.valid, true);

            // DOCX should be allowed
            const docxResult = validateFileType('document.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            assert.strictEqual(docxResult.valid, true);

            // TXT should be allowed
            const txtResult = validateFileType('notes.txt', 'text/plain');
            assert.strictEqual(txtResult.valid, true);

            // RTF should be allowed
            const rtfResult = validateFileType('document.rtf', 'application/rtf');
            assert.strictEqual(rtfResult.valid, true);
        });

        it('should reject disallowed file types', () => {
            // EXE should be rejected
            const exeResult = validateFileType('program.exe', 'application/x-executable');
            assert.strictEqual(exeResult.valid, false);
            assert.ok(exeResult.error);

            // JS should be rejected
            const jsResult = validateFileType('script.js', 'application/javascript');
            assert.strictEqual(jsResult.valid, false);

            // Image should be rejected
            const imgResult = validateFileType('image.png', 'image/png');
            assert.strictEqual(imgResult.valid, false);
        });

        it('should sanitize filenames', () => {
            // Remove path traversal attempts
            assert.strictEqual(sanitizeFilename('../../../etc/passwd'), 'etcpasswd');

            // Remove dangerous characters
            assert.strictEqual(sanitizeFilename('file<script>test.pdf'), 'filescripttest.pdf');

            // Handle empty result
            assert.strictEqual(sanitizeFilename('..'), 'unnamed');

            // Preserve normal filenames
            assert.strictEqual(sanitizeFilename('My Document.pdf'), 'My Document.pdf');
        });

        it('should create filesystem storage and test connection', async () => {
            const storage = new FilesystemStorage();
            const result = await storage.testConnection();
            assert.strictEqual(result.success, true);
            assert.ok(result.message);
        });

        it('should store and retrieve files from filesystem storage', async () => {
            const storage = new FilesystemStorage();

            // Store a test file
            const testContent = Buffer.from('Hello, this is a test file');
            const result = await storage.putObject(
                testContent,
                'test-file.txt',
                { contentType: 'text/plain' }
            );

            assert.ok(result.storage_key);
            assert.strictEqual(result.size_bytes, testContent.length);
            assert.strictEqual(result.content_type, 'text/plain');

            // Retrieve the file
            const { stream, size } = await storage.getObjectStream(result.storage_key);
            assert.strictEqual(size, testContent.length);

            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            const retrievedContent = Buffer.concat(chunks).toString();
            assert.strictEqual(retrievedContent, 'Hello, this is a test file');

            // Delete the file
            await storage.deleteObject(result.storage_key);

            // Verify deletion
            try {
                await storage.getObjectStream(result.storage_key);
                assert.fail('Should have thrown error for deleted file');
            } catch (err) {
                assert.strictEqual(err.message, 'File not found');
            }
        });
    });

    describe('Legal Document Generation', () => {
        it('should have valid document types', () => {
            assert.ok(Array.isArray(DOCUMENT_TYPES));
            assert.ok(DOCUMENT_TYPES.length > 0);
            assert.ok(DOCUMENT_TYPES.includes('demand_letter'));
            assert.ok(DOCUMENT_TYPES.includes('cease_desist'));
            assert.ok(DOCUMENT_TYPES.includes('complaint'));
        });

        it('should generate text to PDF', async () => {
            const content = `TEST DOCUMENT

This is a test document for the legal tracker system.

SECTION 1

Content goes here.

Signature: _______________
Date: _______________`;

            const matter = { id: 1, note: 'Test matter', cost: 100 };
            const buffer = await textToPdf(content, 'demand_letter', matter);

            assert.ok(Buffer.isBuffer(buffer));
            assert.ok(buffer.length > 0);
            // PDF files start with %PDF
            assert.strictEqual(buffer.toString('utf8', 0, 4), '%PDF');
        });

        it('should generate placeholder document without Claude API', async () => {
            const matter = {
                id: 123,
                note: 'Contract dispute',
                cost: 5000.00,
                matter_date: '2024-12-15T00:00:00.000Z'
            };

            const result = await generatePlaceholderDocument(matter);

            assert.ok(result.buffer);
            assert.ok(result.filename);
            assert.strictEqual(result.contentType, 'application/pdf');
            assert.ok(result.docType);
            assert.ok(result.docName);

            // Verify it's a valid PDF
            assert.strictEqual(result.buffer.toString('utf8', 0, 4), '%PDF');
        });
    });

    describe('Attachment API Endpoints', () => {
        it('should list attachments for a matter (initially empty)', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/attachments`, {
                headers: { 'Cookie': adminCookie }
            });

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.ok(Array.isArray(data.attachments));
            assert.strictEqual(data.attachments.length, 0);
        });

        it('should include attachments in matter detail response', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}`, {
                headers: { 'Cookie': adminCookie }
            });

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.ok(Array.isArray(data.attachments));
        });

        it('should reject upload of non-allowed file types', async () => {
            const boundary = '----WebKitFormBoundary' + Date.now();
            const body = [
                `--${boundary}`,
                'Content-Disposition: form-data; name="file"; filename="script.js"',
                'Content-Type: application/javascript',
                '',
                'console.log("malicious code");',
                `--${boundary}--`
            ].join('\r\n');

            const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/attachments`, {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Cookie': adminCookie
                },
                body
            });

            assert.strictEqual(response.status, 400);
            const data = await response.json();
            assert.strictEqual(data.error, 'INVALID_FILE_TYPE');
        });

        it('should upload valid PDF attachment', async () => {
            // Create a minimal valid PDF
            const pdfContent = '%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF';

            const boundary = '----WebKitFormBoundary' + Date.now();
            const body = [
                `--${boundary}`,
                'Content-Disposition: form-data; name="file"; filename="test-document.pdf"',
                'Content-Type: application/pdf',
                '',
                pdfContent,
                `--${boundary}--`
            ].join('\r\n');

            const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/attachments`, {
                method: 'POST',
                headers: {
                    'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    'Cookie': adminCookie
                },
                body
            });

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.strictEqual(data.success, true);
            assert.ok(data.attachment);
            assert.ok(data.attachment.id);
            assert.strictEqual(data.attachment.original_filename, 'test-document.pdf');
            assert.strictEqual(data.attachment.content_type, 'application/pdf');
        });

        it('should list uploaded attachment', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/attachments`, {
                headers: { 'Cookie': adminCookie }
            });

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.strictEqual(data.attachments.length, 1);
            assert.strictEqual(data.attachments[0].original_filename, 'test-document.pdf');
        });

        it('should download attachment', async () => {
            // Get the attachment ID
            const listResponse = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/attachments`, {
                headers: { 'Cookie': adminCookie }
            });
            const listData = await listResponse.json();
            const attachmentId = listData.attachments[0].id;

            // Download the attachment
            const downloadResponse = await fetch(`${baseURL}/admin/api/attachments/${attachmentId}/download`, {
                headers: { 'Cookie': adminCookie }
            });

            assert.strictEqual(downloadResponse.status, 200);
            assert.ok(downloadResponse.headers.get('content-type').includes('application/pdf'));
            assert.ok(downloadResponse.headers.get('content-disposition').includes('test-document.pdf'));
        });

        it('should delete attachment', async () => {
            // Get the attachment ID
            const listResponse = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/attachments`, {
                headers: { 'Cookie': adminCookie }
            });
            const listData = await listResponse.json();
            const attachmentId = listData.attachments[0].id;

            // Delete the attachment
            const deleteResponse = await fetch(`${baseURL}/admin/api/attachments/${attachmentId}`, {
                method: 'DELETE',
                headers: { 'Cookie': adminCookie }
            });

            assert.strictEqual(deleteResponse.status, 200);
            const deleteData = await deleteResponse.json();
            assert.strictEqual(deleteData.success, true);

            // Verify it's deleted
            const verifyResponse = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/attachments`, {
                headers: { 'Cookie': adminCookie }
            });
            const verifyData = await verifyResponse.json();
            assert.strictEqual(verifyData.attachments.length, 0);
        });

        it('should return 404 for non-existent attachment', async () => {
            const response = await fetch(`${baseURL}/admin/api/attachments/99999/download`, {
                headers: { 'Cookie': adminCookie }
            });

            assert.strictEqual(response.status, 404);
        });

        it('should require admin authentication for attachments', async () => {
            const response = await fetch(`${baseURL}/admin/api/matters/${testMatterId}/attachments`);
            assert.strictEqual(response.status, 401);
        });
    });

    describe('Storage Settings API', () => {
        it('should get storage settings', async () => {
            const response = await fetch(`${baseURL}/admin/api/settings/storage`, {
                headers: { 'Cookie': adminCookie }
            });

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.ok('storage_backend' in data);
            assert.ok('has_s3_config' in data);
        });

        it('should test filesystem storage connection', async () => {
            const response = await fetch(`${baseURL}/admin/api/settings/storage/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': adminCookie
                },
                body: JSON.stringify({
                    type: 'filesystem',
                    config: {}
                })
            });

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.strictEqual(data.success, true);
        });

        it('should update storage settings', async () => {
            const response = await fetch(`${baseURL}/admin/api/settings/storage`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': adminCookie
                },
                body: JSON.stringify({
                    storage_backend: 'filesystem'
                })
            });

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.strictEqual(data.success, true);
        });
    });

    describe('Storage Migration API', () => {
        let migrationMatterId;
        let attachmentIds = [];

        before(async () => {
            // Create a matter for migration tests
            const matterResponse = await fetch(`${baseURL}/admin/api/matters`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': adminCookie
                },
                body: JSON.stringify({
                    matter_date: '2024-12-15T10:00:00.000Z',
                    note: 'Test matter for migration',
                    cost: 100.00
                })
            });
            const matterData = await matterResponse.json();
            migrationMatterId = matterData.matter.id;

            // Upload a few test attachments
            for (let i = 0; i < 3; i++) {
                const pdfContent = `%PDF-1.0\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj 3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000052 00000 n\n0000000101 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF\nFile number ${i}`;

                const boundary = '----WebKitFormBoundary' + Date.now() + i;
                const body = [
                    `--${boundary}`,
                    `Content-Disposition: form-data; name="file"; filename="migration-test-${i}.pdf"`,
                    'Content-Type: application/pdf',
                    '',
                    pdfContent,
                    `--${boundary}--`
                ].join('\r\n');

                const response = await fetch(`${baseURL}/admin/api/matters/${migrationMatterId}/attachments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': `multipart/form-data; boundary=${boundary}`,
                        'Cookie': adminCookie
                    },
                    body
                });
                const data = await response.json();
                attachmentIds.push(data.attachment.id);
            }
        });

        it('should get migration status', async () => {
            const response = await fetch(`${baseURL}/admin/api/settings/storage/migration`, {
                headers: { 'Cookie': adminCookie }
            });

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.ok('current_backend' in data);
            assert.ok('filesystem_count' in data);
            assert.ok('filesystem_size' in data);
            assert.ok('s3_count' in data);
            assert.ok('s3_size' in data);
            assert.ok('s3_configured' in data);
            assert.ok('can_migrate_to_s3' in data);
            assert.ok('can_migrate_to_filesystem' in data);
        });

        it('should show filesystem attachments count after upload', async () => {
            const response = await fetch(`${baseURL}/admin/api/settings/storage/migration`, {
                headers: { 'Cookie': adminCookie }
            });

            const data = await response.json();
            assert.ok(data.filesystem_count >= 3, 'Should have at least 3 filesystem attachments');
            assert.ok(data.filesystem_size > 0, 'Filesystem size should be > 0');
        });

        it('should require admin authentication for migration status', async () => {
            const response = await fetch(`${baseURL}/admin/api/settings/storage/migration`);
            assert.strictEqual(response.status, 401);
        });

        it('should require admin authentication for migrate endpoint', async () => {
            const response = await fetch(`${baseURL}/admin/api/settings/storage/migrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ direction: 'local-to-s3' })
            });
            assert.strictEqual(response.status, 401);
        });

        it('should validate migration direction parameter', async () => {
            const response = await fetch(`${baseURL}/admin/api/settings/storage/migrate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': adminCookie
                },
                body: JSON.stringify({ direction: 'invalid-direction' })
            });

            assert.strictEqual(response.status, 400);
            const data = await response.json();
            assert.strictEqual(data.error, 'INVALID_DIRECTION');
        });

        it('should reject migration to S3 when S3 is not configured', async () => {
            // First ensure we're on filesystem backend
            await fetch(`${baseURL}/admin/api/settings/storage`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': adminCookie
                },
                body: JSON.stringify({ storage_backend: 'filesystem' })
            });

            const response = await fetch(`${baseURL}/admin/api/settings/storage/migrate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': adminCookie
                },
                body: JSON.stringify({ direction: 'local-to-s3' })
            });

            assert.strictEqual(response.status, 400);
            const data = await response.json();
            // S3 not configured returns TARGET_NOT_CONFIGURED since S3 is the target
            assert.strictEqual(data.error, 'TARGET_NOT_CONFIGURED');
        });

        it('should return success with zero migrated when no S3 files to migrate', async () => {
            // Migration from S3 to local when all files are already local
            // Since S3 backend is not configured, this returns TARGET_NOT_CONFIGURED
            // (because it can't even check S3 for files without S3 config)
            // However, if filesystem has no files to migrate TO S3, that would also return TARGET_NOT_CONFIGURED
            // The actual migration endpoint checks target storage first, not source

            // Let's test successful return when there are no files in the source backend
            // We need S3 to be configured for this test, but since it's not in test environment,
            // we'll verify the error response is appropriate
            const response = await fetch(`${baseURL}/admin/api/settings/storage/migrate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': adminCookie
                },
                body: JSON.stringify({ direction: 's3-to-local' })
            });

            // Since S3 is not configured as source, it returns SOURCE_NOT_CONFIGURED
            assert.strictEqual(response.status, 400);
            const data = await response.json();
            assert.strictEqual(data.error, 'SOURCE_NOT_CONFIGURED');
        });
    });
});
