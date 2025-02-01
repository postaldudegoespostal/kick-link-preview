/// <reference types="chrome"/>

interface SettingsMessage {
  type: 'settingsChanged';
  settings: {
    youtubeEnabled: boolean;
    instagramEnabled: boolean;
  };
}

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});

// Handle messages from popup to content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'settingsChanged') {
    // Forward the message to all tabs that match our URL pattern
    chrome.tabs.query({ url: '*://*.kick.com/*' }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(error => {
            console.log('Error sending message to tab:', error);
          });
        }
      });
    });
  }
  return true;
}); 
