const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [16, 32, 48, 128];
const sourceFile = path.join(__dirname, '../src/icons/icon.png');
const targetDir = path.join(__dirname, '../dist/icons');

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Generate icons for each size
async function generateIcons() {
  for (const size of sizes) {
    try {
      await sharp(sourceFile)
        .resize(size, size)
        .png()
        .toFile(path.join(targetDir, `icon${size}.png`));
      console.log(`Generated ${size}x${size} icon`);
    } catch (error) {
      console.error(`Error generating ${size}x${size} icon:`, error);
    }
  }
}

generateIcons().catch(console.error); 