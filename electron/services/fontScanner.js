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

// Map weight class to human-readable name
function getWeightName(weightClass) {
  if (!weightClass) return null;
  if (weightClass <= 100) return 'Thin';
  if (weightClass <= 200) return 'ExtraLight';
  if (weightClass <= 300) return 'Light';
  if (weightClass <= 400) return 'Regular';
  if (weightClass <= 500) return 'Medium';
  if (weightClass <= 600) return 'SemiBold';
  if (weightClass <= 700) return 'Bold';
  if (weightClass <= 800) return 'ExtraBold';
  return 'Black';
}

// Detect font category based on font properties
function detectFontCategory(font) {
  const familyName = (font.familyName || '').toLowerCase();
  const postscriptName = (font.postscriptName || '').toLowerCase();
  const combined = familyName + ' ' + postscriptName;

  // Check for common category indicators
  if (combined.includes('mono') || combined.includes('code') || combined.includes('console')) {
    return 'Monospace';
  }
  if (combined.includes('serif') && !combined.includes('sans')) {
    return 'Serif';
  }
  if (combined.includes('sans')) {
    return 'Sans-Serif';
  }
  if (combined.includes('script') || combined.includes('hand') || combined.includes('cursive')) {
    return 'Script';
  }
  if (combined.includes('display') || combined.includes('decorative')) {
    return 'Display';
  }

  // Default based on OS/2 table if available
  return 'Sans-Serif';
}

async function extractFontMetadata(filePath) {
  try {
    const font = await fontkit.open(filePath);

    const weightClass = font['OS/2'] ? font['OS/2'].usWeightClass : null;
    const isVariable = font.variationAxes && Object.keys(font.variationAxes).length > 0;
    const isItalic = (font.subfamilyName || '').toLowerCase().includes('italic') ||
                     (font['OS/2'] && (font['OS/2'].fsSelection & 1));

    return {
      fontName: font.postscriptName || font.fullName || path.basename(filePath),
      fontFamily: font.familyName || '',
      weight: weightClass,
      weightName: getWeightName(weightClass),
      style: font.subfamilyName || '',
      version: font.version || '',
      isVariable: isVariable,
      isItalic: isItalic,
      category: detectFontCategory(font),
    };
  } catch (error) {
    return {
      fontName: path.basename(filePath, path.extname(filePath)),
      fontFamily: '',
      weight: null,
      weightName: null,
      style: '',
      version: '',
      isVariable: false,
      isItalic: false,
      category: null,
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
