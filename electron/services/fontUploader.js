const axios = require('axios');
const fs = require('fs');
const path = require('path');
const config = require('../config');

class FontUploader {
  constructor() {
    this.apiUrl = config.API_URL;
  }

  /**
   * Set the auth token for API requests
   * @param {string} token - JWT auth token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Get headers for authenticated API requests
   */
  getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken}`,
      'Content-Type': 'application/json'
    };
  }

  getMimeType(ext) {
    const mimeTypes = {
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2'
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Upload a font file to R2 via presigned URL
   * @param {string} fontPath - Path to the font file
   * @param {string} userId - User ID (for reference, not used in path anymore)
   * @param {Object} metadata - Font metadata including fileHash
   * @returns {Promise<{success: boolean, storagePath?: string, fontId?: string, error?: string, duplicate?: boolean}>}
   */
  async uploadFontToStorage(fontPath, userId, metadata) {
    try {
      if (!this.authToken) {
        return { success: false, error: 'No auth token set. Call setAuthToken first.' };
      }

      const fileBuffer = fs.readFileSync(fontPath);
      const fileName = path.basename(fontPath);
      const ext = path.extname(fontPath).toLowerCase();

      // Step 1: Request presigned upload URL from server
      const uploadUrlResponse = await axios.post(
        `${this.apiUrl}/fonts/upload-url`,
        {
          fileHash: metadata.fileHash,
          fileName: fileName,
          fileSize: fileBuffer.length,
          fontFormat: ext.substring(1).toUpperCase(),
          metadata: metadata
        },
        { headers: this.getAuthHeaders() }
      );

      const { uploadUrl, storagePath, contentType } = uploadUrlResponse.data;

      // Step 2: Upload directly to R2 using presigned URL
      await axios.put(uploadUrl, fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      // Step 3: Confirm upload with server
      const confirmResponse = await axios.post(
        `${this.apiUrl}/fonts/confirm-upload`,
        {
          storagePath,
          fileHash: metadata.fileHash,
          fileName: fileName,
          fontName: metadata.fontName || fileName,
          fontFamily: metadata.fontFamily || '',
          fileSize: fileBuffer.length,
          fontFormat: ext.substring(1).toUpperCase(),
          deviceId: metadata.deviceId || null,
          metadata: {
            ...metadata,
            originalName: fileName
          }
        },
        { headers: this.getAuthHeaders() }
      );

      return {
        success: true,
        storagePath,
        fontId: confirmResponse.data.font?.id,
        font: confirmResponse.data.font
      };
    } catch (error) {
      // Handle duplicate font response
      if (error.response?.status === 409) {
        return {
          success: false,
          error: 'Font already exists in your library',
          duplicate: true,
          fontId: error.response.data.fontId
        };
      }

      console.error('Upload error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Upload multiple fonts in batch
   * @param {Array<{path: string, metadata: Object}>} fonts - Array of fonts to upload
   * @param {string} userId - User ID
   * @param {Function} progressCallback - Called for each font upload
   * @returns {Promise<{success: boolean, uploaded: number, failed: number, duplicates: number, results: Array}>}
   */
  async uploadFonts(fonts, userId, progressCallback) {
    const results = {
      success: true,
      uploaded: 0,
      failed: 0,
      duplicates: 0,
      results: []
    };

    for (let i = 0; i < fonts.length; i++) {
      const font = fonts[i];

      if (progressCallback) {
        progressCallback({
          current: i + 1,
          total: fonts.length,
          fontName: font.metadata?.fontName || path.basename(font.path)
        });
      }

      const result = await this.uploadFontToStorage(font.path, userId, font.metadata);

      if (result.success) {
        results.uploaded++;
        results.results.push({
          fontPath: font.path,
          storagePath: result.storagePath,
          fontId: result.fontId,
          success: true
        });
      } else if (result.duplicate) {
        results.duplicates++;
        results.results.push({
          fontPath: font.path,
          fontId: result.fontId,
          success: false,
          duplicate: true,
          error: result.error
        });
      } else {
        results.failed++;
        results.results.push({
          fontPath: font.path,
          error: result.error,
          success: false
        });
      }
    }

    return results;
  }

  /**
   * Download a font file from a signed URL
   * @param {string} downloadUrl - Signed URL to download from
   * @param {string} downloadPath - Path where to save the font
   * @returns {Promise<{success: boolean, filePath?: string, error?: string}>}
   */
  async downloadFont(downloadUrl, downloadPath) {
    try {
      const response = await axios.get(downloadUrl, {
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(downloadPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          resolve({
            success: true,
            filePath: downloadPath
          });
        });

        writer.on('error', (error) => {
          reject({
            success: false,
            error: error.message
          });
        });
      });
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = FontUploader;
