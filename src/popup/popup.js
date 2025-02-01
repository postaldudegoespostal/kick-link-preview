document.addEventListener('DOMContentLoaded', () => {
  const pluginToggle = document.getElementById('pluginEnabled');
  const volumeSlider = document.getElementById('volume');
  const volumeValue = document.querySelector('.volume-value');

  // Load saved settings
  chrome.storage.sync.get(['isPluginEnabled', 'volume'], (result) => {
    // Plugin enabled state (default to true if not set)
    pluginToggle.checked = result.isPluginEnabled !== false;
    
    // Volume setting (default to 50 if not set)
    volumeSlider.value = result.volume || 50;
    volumeValue.textContent = `${result.volume || 50}%`;
  });

  // Save plugin state when toggled
  pluginToggle.addEventListener('change', () => {
    const isEnabled = pluginToggle.checked;
    chrome.storage.sync.set({ isPluginEnabled: isEnabled });
  });

  // Save volume when changed
  volumeSlider.addEventListener('input', () => {
    const volume = volumeSlider.value;
    volumeValue.textContent = `${volume}%`;
    chrome.storage.sync.set({ volume: volume });
  });

  volumeSlider.addEventListener('change', async (e) => {
    const volume = e.target.value;
    await chrome.storage.sync.set({ volume });
    
    // Notify content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'volumeChanged',
        volume: parseInt(volume)
      });
    });
  });
}); 