const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Use config from bundled electron config
const supabaseUrl = config.SUPABASE_URL;
const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

class FontUploader {
  constructor() {
    // FontUploader initialized
  }

  /**
   * Upload a font file directly to Supabase Storage
   * @param {string} fontPath - Path to the font file
   * @param {string} userId - User ID for organizing files
   * @param {Object} metadata - Font metadata
   * @returns {Promise<{success: boolean, storagePath?: string, error?: string}>}
   */
  async uploadFontToStorage(fontPath, userId, metadata) {
    try {
      const fileBuffer = fs.readFileSync(fontPath);
      const ext = path.extname(fontPath).toLowerCase();
      const uniqueId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      const storagePath = `${userId}/${uniqueId}${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('fonts')
        .upload(storagePath, fileBuffer, {
          contentType: this.getMimeType(ext),
          upsert: false
        });

      if (uploadError) {
        return { success: false, error: uploadError.message || uploadError.error || 'Upload failed' };
      }

      return {
        success: true,
        storagePath
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  getMimeType(ext) {
    const mimeTypes = {
      '.ttf': 'font/ttf',
      '.otf': 'font/otf',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Upload multiple fonts in batch
   * @param {Array<{path: string, metadata: Object}>} fonts - Array of fonts to upload
   * @param {string} userId - User ID
   * @param {Function} progressCallback - Called for each font upload
   * @returns {Promise<{success: boolean, uploaded: number, failed: number, results: Array}>}
   */
  async uploadFonts(fonts, userId, progressCallback) {
    const results = {
      success: true,
      uploaded: 0,
      failed: 0,
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
          success: true
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
