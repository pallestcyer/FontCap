const chokidar = require('chokidar');
const path = require('path');
const fontScanner = require('./fontScanner');

let watcher = null;

function watch(directories, callback) {
  if (watcher) {
    watcher.close();
  }

  watcher = chokidar.watch(directories, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    ignoreInitial: true,
    depth: 10,
  });

  watcher
    .on('add', async (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
        try {
          const metadata = await fontScanner.extractFontMetadata(filePath);
          callback('add', filePath, metadata);
        } catch (error) {
          console.error('Error processing new font:', error);
        }
      }
    })
    .on('unlink', (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (['.ttf', '.otf', '.woff', '.woff2'].includes(ext)) {
        callback('remove', filePath, { fontName: path.basename(filePath) });
      }
    })
    .on('error', (error) => {
      console.error('Watcher error:', error);
    });

  return watcher;
}

function stop() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
}

module.exports = { watch, stop };
