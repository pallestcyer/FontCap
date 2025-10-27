const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const fontkit = require('fontkit');

function getSystemFontDirectories() {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  switch (platform) {
    case 'win32':
      return [
        'C:\\Windows\\Fonts',
        path.join(homeDir, 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts')
      ];
    case 'darwin':
      return [
        '/System/Library/Fonts',
        '/Library/Fonts',
        path.join(homeDir, 'Library', 'Fonts')
      ];
    case 'linux':
      return [
        '/usr/share/fonts',
        '/usr/local/share/fonts',
        path.join(homeDir, '.fonts'),
        path.join(homeDir, '.local', 'share', 'fonts')
      ];
    default:
      return [];
  }
}

async function calculateFileHash(filePath) {
  const fileBuffer = await fs.readFile(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

async function extractFontMetadata(filePath) {
  try {
    const font = await fontkit.open(filePath);
    
    return {
      fontName: font.postscriptName || font.fullName || path.basename(filePath),
      fontFamily: font.familyName || '',
      weight: font['OS/2'] ? font['OS/2'].usWeightClass : null,
      style: font.subfamilyName || '',
      version: font.version || '',
    };
  } catch (error) {
    return {
      fontName: path.basename(filePath, path.extname(filePath)),
      fontFamily: '',
      weight: null,
      style: '',
      version: '',
    };
  }
}

async function scanDirectory(directory, progress = null) {
  const fonts = [];
  
  try {
    const dirExists = await fs.access(directory).then(() => true).catch(() => false);
    if (!dirExists) {
      return fonts;
    }

    const entries = await fs.readdir(directory, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      
      if (entry.isDirectory()) {
        const subFonts = await scanDirectory(fullPath, progress);
        fonts.push(...subFonts);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
          try {
            const stats = await fs.stat(fullPath);
            const fileHash = await calculateFileHash(fullPath);
            const metadata = await extractFontMetadata(fullPath);
            
            fonts.push({
              ...metadata,
              filePath: fullPath,
              fileSize: stats.size,
              fileHash: fileHash,
              fontFormat: ext.substring(1).toUpperCase(),
            });
            
            if (progress) {
              progress(fonts.length);
            }
          } catch (error) {
            console.error(`Error processing font ${fullPath}:`, error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${directory}:`, error.message);
  }
  
  return fonts;
}

async function scanDirectories(directories) {
  const allFonts = [];
  
  for (const directory of directories) {
    const fonts = await scanDirectory(directory);
    allFonts.push(...fonts);
  }
  
  return allFonts;
}

module.exports = {
  getSystemFontDirectories,
  scanDirectories,
  calculateFileHash,
  extractFontMetadata,
};
