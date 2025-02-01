const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const browser = process.argv[2];
if (!browser) {
  console.error('Please specify a browser: chrome, firefox, or edge');
  process.exit(1);
}

const distDir = path.join(__dirname, '../dist');
const outputDir = path.join(__dirname, '../packages');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const output = fs.createWriteStream(path.join(outputDir, `kick-link-preview-${browser}.zip`));
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

output.on('close', () => {
  console.log(`${browser} package created: ${archive.pointer()} bytes`);
});

archive.on('error', (err) => {
  throw err;
});

archive.pipe(output);

// Add all files from dist directory
archive.directory(distDir, false);

archive.finalize(); 