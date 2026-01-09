/**
 * Storage Abstraction Layer
 * Provides a unified interface for file storage with filesystem and S3-compatible backends
 */

import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync, statSync } from 'fs';
import { mkdir, stat, unlink, readdir } from 'fs/promises';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Allowed file types for manual uploads
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.rtf', '.txt'];
const ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/rtf',
    'text/rtf',
    'text/plain'
];

// Max file size: 25MB
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Validate file type by extension and content type
 * @param {string} filename - Original filename
 * @param {string} contentType - MIME type
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFileType(filename, contentType) {
    const ext = extname(filename).toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(ext)) {
        return {
            valid: false,
            error: `File type '${ext}' not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(', ')}`
        };
    }

    // Normalize content type (remove charset etc)
    const normalizedType = contentType?.split(';')[0]?.trim()?.toLowerCase();

    if (!normalizedType || !ALLOWED_MIME_TYPES.includes(normalizedType)) {
        return {
            valid: false,
            error: `Content type '${normalizedType}' not allowed`
        };
    }

    return { valid: true };
}

/**
 * Sanitize filename for safe storage
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename) {
    // Remove path traversal attempts
    let safe = filename.replace(/\.\./g, '').replace(/[/\\]/g, '');
    // Remove potentially dangerous characters
    safe = safe.replace(/[<>:"|?*\x00-\x1f]/g, '');
    // Limit length
    if (safe.length > 255) {
        const ext = extname(safe);
        safe = safe.substring(0, 255 - ext.length) + ext;
    }
    return safe || 'unnamed';
}

/**
 * Generate a unique storage key
 * @param {string} filename - Original filename
 * @returns {string} Storage key
 */
function generateStorageKey(filename) {
    const sanitized = sanitizeFilename(filename);
    const uuid = randomUUID();
    const ext = extname(sanitized);
    const base = sanitized.substring(0, sanitized.length - ext.length);
    // Format: uuid/original-name.ext
    return `${uuid}/${base}${ext}`;
}

/**
 * Filesystem Storage Backend
 * Stores files in a local directory
 */
class FilesystemStorage {
    constructor(basePath) {
        this.basePath = basePath || join(__dirname, 'data', 'uploads');
        this.type = 'filesystem';

        // Ensure base directory exists
        if (!existsSync(this.basePath)) {
            mkdirSync(this.basePath, { recursive: true });
        }
    }

    /**
     * Store an object
     * @param {Readable|Buffer} data - File data stream or buffer
     * @param {string} filename - Original filename
     * @param {{ contentType: string }} metadata - File metadata
     * @returns {Promise<{ storage_key: string, size_bytes: number, content_type: string }>}
     */
    async putObject(data, filename, metadata = {}) {
        const storageKey = generateStorageKey(filename);
        const fullPath = join(this.basePath, storageKey);

        // Ensure directory exists
        const dir = dirname(fullPath);
        await mkdir(dir, { recursive: true });

        let sizeBytes = 0;

        if (Buffer.isBuffer(data)) {
            // Direct buffer write
            const writeStream = createWriteStream(fullPath);
            await pipeline(Readable.from(data), writeStream);
            sizeBytes = data.length;
        } else {
            // Stream write with size tracking
            const writeStream = createWriteStream(fullPath);

            await new Promise((resolve, reject) => {
                data.on('data', (chunk) => {
                    sizeBytes += chunk.length;
                    if (sizeBytes > MAX_FILE_SIZE) {
                        data.destroy();
                        writeStream.destroy();
                        reject(new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`));
                    }
                });
                data.pipe(writeStream);
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
                data.on('error', reject);
            });
        }

        return {
            storage_key: storageKey,
            size_bytes: sizeBytes,
            content_type: metadata.contentType || 'application/octet-stream'
        };
    }

    /**
     * Get an object as a readable stream
     * @param {string} storageKey - Storage key
     * @returns {Promise<{ stream: Readable, size: number, contentType: string }>}
     */
    async getObjectStream(storageKey) {
        const fullPath = join(this.basePath, storageKey);

        if (!existsSync(fullPath)) {
            throw new Error('File not found');
        }

        const stats = statSync(fullPath);
        const stream = createReadStream(fullPath);

        return {
            stream,
            size: stats.size,
            contentType: 'application/octet-stream' // Content type stored in DB
        };
    }

    /**
     * Delete an object
     * @param {string} storageKey - Storage key
     */
    async deleteObject(storageKey) {
        const fullPath = join(this.basePath, storageKey);

        if (existsSync(fullPath)) {
            unlinkSync(fullPath);

            // Try to clean up empty directory
            const dir = dirname(fullPath);
            try {
                const files = await readdir(dir);
                if (files.length === 0) {
                    await unlink(dir).catch(() => {});
                }
            } catch {
                // Ignore directory cleanup errors
            }
        }
    }

    /**
     * Check if storage is configured and accessible
     * @returns {Promise<{ success: boolean, message?: string }>}
     */
    async testConnection() {
        try {
            // Ensure directory exists and is writable
            if (!existsSync(this.basePath)) {
                await mkdir(this.basePath, { recursive: true });
            }

            // Test write permission by creating and deleting a test file
            const testFile = join(this.basePath, '.test-' + Date.now());
            const writeStream = createWriteStream(testFile);
            writeStream.write('test');
            writeStream.end();

            await new Promise((resolve, reject) => {
                writeStream.on('finish', resolve);
                writeStream.on('error', reject);
            });

            unlinkSync(testFile);

            return { success: true, message: `Filesystem storage ready at ${this.basePath}` };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

/**
 * S3-Compatible Storage Backend
 * Supports AWS S3, MinIO, Backblaze B2, Wasabi
 */
class S3Storage {
    constructor(config) {
        this.config = config;
        this.type = 's3';
        this.client = null;
    }

    /**
     * Get or create S3 client
     * @returns {Promise<S3Client>}
     */
    async getClient() {
        if (this.client) {
            return this.client;
        }

        // Dynamically import AWS SDK to avoid requiring it when not using S3
        const { S3Client } = await import('@aws-sdk/client-s3');

        const clientConfig = {
            region: this.config.region || 'us-east-1',
            credentials: {
                accessKeyId: this.config.accessKeyId,
                secretAccessKey: this.config.secretAccessKey
            }
        };

        // Custom endpoint for S3-compatible services
        if (this.config.endpoint) {
            clientConfig.endpoint = this.config.endpoint;
        }

        // Path style addressing for MinIO and some other services
        if (this.config.forcePathStyle) {
            clientConfig.forcePathStyle = true;
        }

        this.client = new S3Client(clientConfig);
        return this.client;
    }

    /**
     * Store an object
     * @param {Readable|Buffer} data - File data stream or buffer
     * @param {string} filename - Original filename
     * @param {{ contentType: string }} metadata - File metadata
     * @returns {Promise<{ storage_key: string, size_bytes: number, content_type: string }>}
     */
    async putObject(data, filename, metadata = {}) {
        const { PutObjectCommand } = await import('@aws-sdk/client-s3');
        const { Upload } = await import('@aws-sdk/lib-storage');

        const client = await this.getClient();
        const storageKey = generateStorageKey(filename);
        const contentType = metadata.contentType || 'application/octet-stream';

        let body;
        let sizeBytes = 0;

        if (Buffer.isBuffer(data)) {
            body = data;
            sizeBytes = data.length;
        } else {
            // For streams, collect into buffer for size calculation
            // (S3 multipart upload handles large files better with streams, but we need size)
            const chunks = [];
            for await (const chunk of data) {
                sizeBytes += chunk.length;
                if (sizeBytes > MAX_FILE_SIZE) {
                    throw new Error(`File exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
                }
                chunks.push(chunk);
            }
            body = Buffer.concat(chunks);
        }

        // Use multipart upload for larger files
        if (sizeBytes > 5 * 1024 * 1024) {
            const upload = new Upload({
                client,
                params: {
                    Bucket: this.config.bucket,
                    Key: storageKey,
                    Body: body,
                    ContentType: contentType
                }
            });
            await upload.done();
        } else {
            await client.send(new PutObjectCommand({
                Bucket: this.config.bucket,
                Key: storageKey,
                Body: body,
                ContentType: contentType
            }));
        }

        return {
            storage_key: storageKey,
            size_bytes: sizeBytes,
            content_type: contentType
        };
    }

    /**
     * Get an object as a readable stream
     * @param {string} storageKey - Storage key
     * @returns {Promise<{ stream: Readable, size: number, contentType: string }>}
     */
    async getObjectStream(storageKey) {
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');

        const client = await this.getClient();
        const response = await client.send(new GetObjectCommand({
            Bucket: this.config.bucket,
            Key: storageKey
        }));

        return {
            stream: response.Body,
            size: response.ContentLength,
            contentType: response.ContentType || 'application/octet-stream'
        };
    }

    /**
     * Delete an object
     * @param {string} storageKey - Storage key
     */
    async deleteObject(storageKey) {
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');

        const client = await this.getClient();
        await client.send(new DeleteObjectCommand({
            Bucket: this.config.bucket,
            Key: storageKey
        }));
    }

    /**
     * Test S3 connection and credentials
     * @returns {Promise<{ success: boolean, message?: string }>}
     */
    async testConnection() {
        try {
            const { ListBucketsCommand, HeadBucketCommand } = await import('@aws-sdk/client-s3');

            const client = await this.getClient();

            // Try to verify bucket access
            await client.send(new HeadBucketCommand({
                Bucket: this.config.bucket
            }));

            return { success: true, message: `Connected to S3 bucket: ${this.config.bucket}` };
        } catch (error) {
            let message = error.message;

            // Provide helpful error messages
            if (error.name === 'NoSuchBucket') {
                message = `Bucket '${this.config.bucket}' does not exist`;
            } else if (error.name === 'AccessDenied' || error.code === 'AccessDenied') {
                message = 'Access denied. Check your credentials and bucket permissions.';
            } else if (error.code === 'InvalidAccessKeyId') {
                message = 'Invalid Access Key ID';
            } else if (error.code === 'SignatureDoesNotMatch') {
                message = 'Invalid Secret Access Key';
            } else if (error.code === 'ENOTFOUND') {
                message = 'Could not connect to endpoint. Check the endpoint URL.';
            }

            return { success: false, message };
        }
    }
}

/**
 * Create a storage instance based on configuration
 * @param {Object} settingsDb - Settings database helper
 * @returns {FilesystemStorage|S3Storage}
 */
export function createStorage(settingsDb) {
    const storageBackend = settingsDb.get('storage_backend') || 'filesystem';

    if (storageBackend === 's3') {
        const config = {
            accessKeyId: settingsDb.get('s3_access_key_id'),
            secretAccessKey: settingsDb.get('s3_secret_access_key'),
            bucket: settingsDb.get('s3_bucket'),
            region: settingsDb.get('s3_region') || 'us-east-1',
            endpoint: settingsDb.get('s3_endpoint') || null,
            forcePathStyle: settingsDb.get('s3_path_style') === 'true'
        };

        // Validate required fields
        if (!config.accessKeyId || !config.secretAccessKey || !config.bucket) {
            console.warn('S3 storage not fully configured, falling back to filesystem');
            return new FilesystemStorage();
        }

        return new S3Storage(config);
    }

    // Default to filesystem
    const uploadPath = settingsDb.get('storage_filesystem_path') || null;
    return new FilesystemStorage(uploadPath);
}

/**
 * Create storage instance from explicit config (for testing connections)
 * @param {Object} config - Storage configuration
 * @returns {FilesystemStorage|S3Storage}
 */
export function createStorageFromConfig(config) {
    if (config.type === 's3') {
        return new S3Storage(config);
    }
    return new FilesystemStorage(config.path);
}

export { FilesystemStorage, S3Storage, MAX_FILE_SIZE, ALLOWED_EXTENSIONS, ALLOWED_MIME_TYPES };
