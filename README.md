# Kick Link Preview Extension

Preview YouTube, Instagram, and Twitter links directly in Kick.com chat.

## 🌟 Chrome Installation

1. [Click here](https://github.com/your-username/kick-link-preview/raw/main/kick-link-preview-chrome.zip) to download the extension.
2. Extract the downloaded ZIP file.
3. Go to `chrome://extensions` in Chrome.
4. Enable "Developer mode" in the top right.
5. Click "Load unpacked".
6. Select the extracted folder.

That's it! You can now see link previews on Kick.com.

<a href="https://github.com/your-username/kick-link-preview/raw/main/kick-link-preview-chrome.zip">
  <img src="https://user-images.githubusercontent.com/25423296/163456518-d8bcb1d4-1e9e-4a1e-8f61-ce3a514d8228.png" width="200" alt="Download Extension" />
</a>

## Beta v0.1.11 (Hotfix)

### 🛠️ Fixes & Improvements
- Fixed Enable Plugin functionality (you can now completely disable the extension)
- Fixed YouTube volume control (volume settings are now correctly applied)
- Fixed dashboard page crashes
- Optimized preview sizes:
  - YouTube: 480x360 (4:3 ratio)
  - Twitter: 450x450
  - Instagram: 400x600

### 🔜 Upcoming Features
- Prnt.sc preview support
- Hizliresim preview support
- Autoplay for Instagram videos

## Installation for Other Browsers

### Firefox
1. Go to `about:debugging`
2. Click on "This Firefox"
3. Click "Load Temporary Add-on" and select manifest.json from the `dist-firefox` folder

### Edge
1. Go to `edge://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select the `dist-edge` folder

### Opera
1. Go to `opera://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select the `dist` folder (compatible with Chrome version)

## Build Instructions

To build for different browsers:

```bash
# For Chrome
npm run build:chrome

# For Firefox
npm run build:firefox

# For Edge
npm run build:edge

# For Opera (use Chrome build)
npm run build:chrome
```

## Notes

- This extension is in beta, bugs may occur
- If you encounter any issues, you can disable the extension using the Enable Plugin toggle
- Volume control only applies to YouTube videos

## 💻 Supported Browsers
- Google Chrome
- Mozilla Firefox
- Microsoft Edge
- Opera

## 🛠️ Developer Notes

### Build Commands
```bash
# Build for Chrome
npm run build:chrome

# Build for Firefox
npm run build:firefox

# Build for Edge
npm run build:edge

# Build for Opera
npm run build:chrome
```

## 📝 License
MIT License - All rights reserved. 