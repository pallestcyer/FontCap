/**
 * Cloudflare R2 Storage Service
 * Handles font file storage using S3-compatible API
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

// R2 configuration from environment
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'fontcap-fonts';

// Check if R2 is configured
const isR2Configured = Boolean(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);

// Create S3 client for R2
const s3Client = isR2Configured ? new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
}) : null;

/**
 * Generate a presigned URL for uploading a font file
 * @param {string} storagePath - The path where the file will be stored (e.g., "userId/uniqueId.ttf")
 * @param {string} contentType - The MIME type of the file
 * @param {number} expiresIn - URL expiration time in seconds (default: 5 minutes)
 * @returns {Promise<{success: boolean, uploadUrl?: string, error?: string}>}
 */
async function generateUploadUrl(storagePath, contentType, expiresIn = 300) {
  if (!isR2Configured) {
    return { success: false, error: 'R2 storage not configured' };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storagePath,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return { success: true, uploadUrl };
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate a presigned URL for downloading a font file
 * @param {string} storagePath - The path of the file in storage
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<{success: boolean, downloadUrl?: string, error?: string}>}
 */
async function generateDownloadUrl(storagePath, expiresIn = 3600) {
  if (!isR2Configured) {
    return { success: false, error: 'R2 storage not configured' };
  }

  try {
    // R2 uses GetObjectCommand for presigned download URLs
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storagePath,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return { success: true, downloadUrl };
  } catch (error) {
    console.error('Error generating download URL:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a font file from R2 storage
 * @param {string} storagePath - The path of the file to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteFile(storagePath) {
  if (!isR2Configured) {
    return { success: false, error: 'R2 storage not configured' };
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storagePath,
    });

    await s3Client.send(command);

    return { success: true };
  } catch (error) {
    console.error('Error deleting file from R2:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if a file exists in R2 storage
 * @param {string} storagePath - The path of the file to check
 * @returns {Promise<{exists: boolean, error?: string}>}
 */
async function fileExists(storagePath) {
  if (!isR2Configured) {
    return { exists: false, error: 'R2 storage not configured' };
  }

  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: storagePath,
    });

    await s3Client.send(command);
    return { exists: true };
  } catch (error) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    console.error('Error checking file existence:', error);
    return { exists: false, error: error.message };
  }
}

/**
 * Check if R2 storage is properly configured and accessible
 * @returns {Promise<{healthy: boolean, error?: string}>}
 */
async function checkHealth() {
  if (!isR2Configured) {
    return { healthy: false, error: 'R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.' };
  }

  try {
    // Try to list objects (with max 1) to verify connection
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 1,
    });

    await s3Client.send(command);
    return { healthy: true };
  } catch (error) {
    console.error('R2 health check failed:', error);
    return { healthy: false, error: error.message };
  }
}

/**
 * Get MIME type for a font file extension
 * @param {string} ext - File extension (with or without dot)
 * @returns {string}
 */
function getMimeType(ext) {
  const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
  const mimeTypes = {
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };
  return mimeTypes[normalizedExt.toLowerCase()] || 'application/octet-stream';
}

module.exports = {
  isR2Configured,
  generateUploadUrl,
  generateDownloadUrl,
  deleteFile,
  fileExists,
  checkHealth,
  getMimeType,
};
