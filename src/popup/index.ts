/// <reference types="chrome"/>
import browser from 'webextension-polyfill';

interface Settings {
  youtubeEnabled: boolean;
  instagramEnabled: boolean;
  [key: string]: boolean;  // Add index signature for storage operations
}

class PopupManager {
  private youtubeToggle: HTMLInputElement | null;
  private instagramToggle: HTMLInputElement | null;

  constructor() {
    this.youtubeToggle = null;
    this.instagramToggle = null;
    this.initializeElements();
    this.loadSettings();
    this.attachEventListeners();
  }

  private initializeElements(): void {
    this.youtubeToggle = document.getElementById('youtube-toggle') as HTMLInputElement;
    this.instagramToggle = document.getElementById('instagram-toggle') as HTMLInputElement;
  }

  private async loadSettings(): Promise<void> {
    try {
      const settings = await this.getSettings();
      if (this.youtubeToggle) {
        this.youtubeToggle.checked = settings.youtubeEnabled;
      }
      if (this.instagramToggle) {
        this.instagramToggle.checked = settings.instagramEnabled;
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  private attachEventListeners(): void {
    this.youtubeToggle?.addEventListener('change', () => this.saveSettings());
    this.instagramToggle?.addEventListener('change', () => this.saveSettings());
  }

  private async getSettings(): Promise<Settings> {
    try {
      const defaultSettings: Settings = {
        youtubeEnabled: true,
        instagramEnabled: true
      };
      
      const result = await browser.storage.sync.get(defaultSettings);
      return result as Settings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return {
        youtubeEnabled: true,
        instagramEnabled: true
      };
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      const settings: Settings = {
        youtubeEnabled: this.youtubeToggle?.checked ?? true,
        instagramEnabled: this.instagramToggle?.checked ?? true
      };

      await browser.storage.sync.set(settings);

      // Notify content script about settings change
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (currentTab?.id && currentTab.url?.includes('kick.com')) {
        try {
          await browser.tabs.sendMessage(currentTab.id, {
            type: 'settingsChanged',
            settings
          });
          console.log('Settings updated successfully');
        } catch (error) {
          // Ignore connection error as content script might not be loaded
          console.log('Content script not ready, settings saved to storage');
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
}); 