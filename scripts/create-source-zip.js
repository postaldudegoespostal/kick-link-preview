const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const sourceDir = path.join(__dirname, '../');
const outputPath = path.join(__dirname, '../source-code/kick-link-preview-source.zip');

// Create output directory if it doesn't exist
if (!fs.existsSync(path.dirname(outputPath))) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
}

const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Handle archive warnings
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('Warning:', err);
  } else {
    throw err;
  }
});

// Handle archive errors
archive.on('error', function(err) {
  throw err;
});

// Log when the archive is finalized
output.on('close', function() {
  console.log(`Source code archive created: ${archive.pointer()} bytes`);
});

// Pipe archive data to the file
archive.pipe(output);

// Add source files
archive.glob('src/**/*', { ignore: ['**/node_modules/**'] });
archive.glob('scripts/**/*');
archive.file('package.json');
archive.file('package-lock.json');
archive.file('webpack.config.js');
archive.file('tsconfig.json');
archive.file('README.md');
archive.file('.gitignore');

// Finalize the archive
archive.finalize(); 