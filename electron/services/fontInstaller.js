const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class FontInstaller {
  /**
   * Get the system font installation directory based on platform
   */
  getInstallDirectory() {
    const platform = process.platform;

    switch (platform) {
      case 'win32':
        return path.join(process.env.LOCALAPPDATA || process.env.APPDATA, 'Microsoft', 'Windows', 'Fonts');

      case 'darwin':
        return path.join(os.homedir(), 'Library', 'Fonts');

      case 'linux':
        return path.join(os.homedir(), '.local', 'share', 'fonts');

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Install a font file to the system fonts directory
   * @param {string} sourcePath - Path to the font file to install
   * @param {string} fontName - Name of the font file
   * @returns {Promise<{success: boolean, installedPath?: string, error?: string}>}
   */
  async installFont(sourcePath, fontName) {
    try {
      const installDir = this.getInstallDirectory();

      // Ensure install directory exists
      await fs.mkdir(installDir, { recursive: true });

      const targetPath = path.join(installDir, fontName);

      // Check if font already exists
      try {
        await fs.access(targetPath);
        console.log(`Font already installed: ${targetPath}`);
        return { success: true, installedPath: targetPath, alreadyExists: true };
      } catch (err) {
        // Font doesn't exist, proceed with installation
      }

      // Copy font file to install directory
      await fs.copyFile(sourcePath, targetPath);

      // Platform-specific font registration
      if (process.platform === 'win32') {
        // On Windows, we need to register the font
        try {
          // Add font to registry (requires admin rights in some cases)
          // For user fonts, copying to the user fonts folder is usually sufficient
          console.log(`Font installed to user directory: ${targetPath}`);
        } catch (regError) {
          console.warn('Could not register font in registry:', regError.message);
        }
      } else if (process.platform === 'linux') {
        // Rebuild font cache on Linux
        try {
          await execAsync('fc-cache -f');
        } catch (cacheError) {
          console.warn('Could not rebuild font cache:', cacheError.message);
        }
      }

      console.log(`Successfully installed font: ${targetPath}`);

      return {
        success: true,
        installedPath: targetPath
      };
    } catch (error) {
      console.error('Font installation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Uninstall a font from the system
   * @param {string} fontName - Name of the font file to uninstall
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async uninstallFont(fontName) {
    try {
      const installDir = this.getInstallDirectory();
      const fontPath = path.join(installDir, fontName);

      await fs.unlink(fontPath);

      // Rebuild font cache on Linux
      if (process.platform === 'linux') {
        try {
          await execAsync('fc-cache -f');
        } catch (cacheError) {
          console.warn('Could not rebuild font cache:', cacheError.message);
        }
      }

      console.log(`Successfully uninstalled font: ${fontPath}`);

      return { success: true };
    } catch (error) {
      console.error('Font uninstallation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if a font is installed
   * @param {string} fontName - Name of the font file
   * @returns {Promise<boolean>}
   */
  async isInstalled(fontName) {
    try {
      const installDir = this.getInstallDirectory();
      const fontPath = path.join(installDir, fontName);
      await fs.access(fontPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all installed fonts in the user directory
   * @returns {Promise<string[]>}
   */
  async getInstalledFonts() {
    try {
      const installDir = this.getInstallDirectory();
      const files = await fs.readdir(installDir);
      return files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.ttf', '.otf', '.woff', '.woff2'].includes(ext);
      });
    } catch (error) {
      console.error('Error reading installed fonts:', error);
      return [];
    }
  }
}

module.exports = new FontInstaller();
