import { Link } from './linkDetector';
import { InstagramService } from '../services/instagramService';

interface PreviewSettings {
  isEnabled: boolean;
  volume: number;
}

export class PreviewManager {
  private previewContainer: HTMLDivElement | null = null;
  private currentLink: string | null = null;
  private hideTimeout: number | null = null;
  private showTimeout: number | null = null;  // New timeout for delayed showing
  private instagramService: InstagramService;
  private isPreviewVisible: boolean = false;
  private settings: PreviewSettings = {
    isEnabled: true,
    volume: 70
  };
  private isTransitioning: boolean = false;
  private hideDelay: number = 1000; // 1 second delay
  private showDelay: number = 1000; // 1 second delay for showing new previews
  private initialLink: { url: string; type: 'youtube' | 'instagram' | 'twitter' | 'prntsc' | 'hizliresim' | 'general'; element: HTMLElement } | null = null;
  private isTimeoutActive: boolean = false;
  private isEnabled: boolean = false;

  constructor() {
    this.createPreviewContainer();
    this.instagramService = new InstagramService();
    this.loadSettings();
    this.setupMessageListener();
    console.log('PreviewManager initialized');

    // Get initial settings
    chrome.storage.sync.get(['isPluginEnabled', 'volume'], (result) => {
      this.isEnabled = result.isPluginEnabled !== false;
      this.settings.volume = result.volume || 50;
      
      if (this.isEnabled) {
        this.initialize();
      }
    });

    // Listen for settings changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.isPluginEnabled) {
        this.isEnabled = changes.isPluginEnabled.newValue;
        if (!this.isEnabled) {
          this.cleanup();
        } else {
          this.initialize();
        }
      }
      if (changes.volume) {
        this.settings.volume = changes.volume.newValue;
      }
    });
  }

  private async loadSettings(): Promise<void> {
    const result = await chrome.storage.sync.get({
      isEnabled: true,
      volume: 70
    }) as PreviewSettings;
    
    this.settings = result;
    console.log('Loaded settings:', this.settings);
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: { type: string; settings?: any; volume?: number }, sender, sendResponse) => {
      try {
        if (message.type === 'settingsChanged' && message.settings) {
          this.settings.isEnabled = message.settings.isEnabled;
          if (!this.settings.isEnabled) {
            this.hidePreviewContainer();
          }
          console.log('Settings updated:', this.settings);
          sendResponse({ success: true });
        } else if (message.type === 'volumeChanged' && typeof message.volume === 'number') {
          this.settings.volume = message.volume;
          this.updateAllPreviewVolumes();
          console.log('Volume updated:', this.settings.volume);
          sendResponse({ success: true });
        }
      } catch (error) {
        console.error('Error handling message:', error);
        if (error instanceof Error) {
          sendResponse({ success: false, error: error.message });
        } else {
          sendResponse({ success: false, error: 'Unknown error occurred' });
        }
      }
      return true;
    });
  }

  private updateAllPreviewVolumes(): void {
    if (!this.previewContainer) return;

    // Update YouTube iframe volume
    const youtubeIframe = this.previewContainer.querySelector('iframe[src*="youtube.com"]');
    if (youtubeIframe instanceof HTMLIFrameElement) {
      const currentSrc = new URL(youtubeIframe.src);
      const volume = this.settings.volume;
      currentSrc.searchParams.set('volume', volume.toString());
      if (volume > 0) {
        currentSrc.searchParams.set('mute', '0');
      } else {
        currentSrc.searchParams.set('mute', '1');
      }
      youtubeIframe.src = currentSrc.toString();
    }

    // Update Twitter iframe volume
    const twitterIframe = this.previewContainer.querySelector('iframe[src*="twitter.com"]');
    if (twitterIframe instanceof HTMLIFrameElement) {
      const currentSrc = new URL(twitterIframe.src);
      currentSrc.searchParams.set('volume', (this.settings.volume / 100).toString());
      twitterIframe.src = currentSrc.toString();
    }

    // Update Instagram iframe volume
    const instagramIframe = this.previewContainer.querySelector('iframe[src*="instagram.com"]');
    if (instagramIframe instanceof HTMLIFrameElement) {
      try {
        const iframeDoc = instagramIframe.contentDocument || instagramIframe.contentWindow?.document;
        if (iframeDoc) {
          const video = iframeDoc.querySelector('video');
          if (video) {
            video.volume = this.settings.volume / 100;
          }
        }
      } catch (e) {
        console.error('Could not update Instagram video volume:', e);
      }
    }
  }

  private createPreviewContainer(): void {
    // Remove existing container if any
    if (this.previewContainer) {
      document.body.removeChild(this.previewContainer);
    }

    // Create new container
    this.previewContainer = document.createElement('div');
    this.previewContainer.style.position = 'fixed';
    this.previewContainer.style.bottom = '80px';  // Keep space for chat input
    this.previewContainer.style.right = '20px';
    this.previewContainer.style.background = 'rgba(0, 0, 0, 0.95)';
    this.previewContainer.style.borderRadius = '12px';
    this.previewContainer.style.padding = '12px';
    this.previewContainer.style.zIndex = '999999';
    this.previewContainer.style.display = 'none';
    this.previewContainer.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
    this.previewContainer.style.transform = 'scale(0.95)';
    this.previewContainer.style.opacity = '0';
    this.previewContainer.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
    this.previewContainer.style.border = '1px solid rgba(255, 255, 255, 0.1)';

    // Add close button
    this.addCloseButton();

    document.body.appendChild(this.previewContainer);
  }

  private addCloseButton(): void {
    if (!this.previewContainer) return;

    const closeButton = document.createElement('div');
    closeButton.className = 'preview-close-btn';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '8px';
    closeButton.style.right = '8px';
    closeButton.style.width = '24px';
    closeButton.style.height = '24px';
    closeButton.style.background = 'rgba(0, 0, 0, 0.5)';
    closeButton.style.borderRadius = '50%';
    closeButton.style.cursor = 'pointer';
    closeButton.style.display = 'flex';
    closeButton.style.alignItems = 'center';
    closeButton.style.justifyContent = 'center';
    closeButton.style.color = '#fff';
    closeButton.style.fontSize = '18px';
    closeButton.style.fontFamily = 'Arial, sans-serif';
    closeButton.style.transition = 'all 0.2s ease';
    closeButton.style.zIndex = '1000000';
    closeButton.innerHTML = '×';
    closeButton.title = 'Close preview';

    // Hover effect
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(0, 0, 0, 0.5)';
    });

    // Click handler
    let isPreviewLocked = false;
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!isPreviewLocked) {
        isPreviewLocked = true;
        this.hidePreviewContainer();
        
        // Prevent showing new previews for 2 seconds
        setTimeout(() => {
          isPreviewLocked = false;
        }, 2000);
      }
    });

    this.previewContainer.appendChild(closeButton);
  }

  private startHideTimer(): void {
    if (this.hideTimeout !== null) {
      window.clearTimeout(this.hideTimeout);
    }
    
    this.hideTimeout = window.setTimeout(() => {
      this.isTransitioning = true;
      this.hidePreviewContainer();
      // Reset transition state after animation completes
      setTimeout(() => {
        this.isTransitioning = false;
      }, 300);
    }, this.hideDelay);
  }

  public attachPreviewHandler(link: { url: string; type: 'youtube' | 'instagram' | 'twitter' | 'prntsc' | 'hizliresim' | 'general'; element: HTMLElement }) {
    if (!this.settings.isEnabled) return;
    
    const element = link.element;

    element.addEventListener('mouseenter', () => {
      if (this.isTransitioning) return;

      // If timeout is active, don't show new preview
      if (this.isTimeoutActive) {
        return;
      }

      // Store initial link if not set
      if (!this.initialLink) {
        this.initialLink = link;
      }

      // Clear any existing timeouts
      if (this.hideTimeout !== null) {
        window.clearTimeout(this.hideTimeout);
        this.hideTimeout = null;
      }
      if (this.showTimeout !== null) {
        window.clearTimeout(this.showTimeout);
        this.showTimeout = null;
      }

      // If there's a current preview showing, delay the new preview
      if (this.isPreviewVisible) {
        this.isTimeoutActive = true;
        this.showTimeout = window.setTimeout(() => {
          this.isTimeoutActive = false;
          // Show the initial link's preview
          if (this.initialLink) {
            this.showNewPreview(this.initialLink);
          }
        }, this.showDelay);
        return;
      }

      this.showNewPreview(link);
    });

    element.addEventListener('mouseleave', () => {
      this.startHideTimer();
    });

    // Add hover handler for the preview container itself
    if (this.previewContainer) {
      this.previewContainer.addEventListener('mouseenter', () => {
        if (this.hideTimeout !== null) {
          window.clearTimeout(this.hideTimeout);
          this.hideTimeout = null;
        }
      });

      this.previewContainer.addEventListener('mouseleave', () => {
        this.startHideTimer();
      });
    }
  }

  private async showNewPreview(link: { url: string; type: 'youtube' | 'instagram' | 'twitter' | 'prntsc' | 'hizliresim' | 'general'; element: HTMLElement }) {
    if (!this.previewContainer || !this.settings.isEnabled) return;

    // Don't show preview if it's the same link
    if (this.currentLink === link.url) return;

    this.currentLink = link.url;
    this.previewContainer.innerHTML = '';
    this.addCloseButton();

    try {
      switch (link.type) {
        case 'prntsc':
        case 'hizliresim':
          await this.showImagePreview({ url: link.url, type: link.type, element: link.element });
          break;
        case 'youtube':
          await this.showYouTubePreview({ url: link.url, type: 'youtube', element: link.element });
          break;
        case 'instagram':
          await this.showInstagramPreview({ url: link.url, type: 'instagram', element: link.element });
          break;
        case 'twitter':
          await this.showTwitterPreview({ url: link.url, type: 'twitter', element: link.element });
          break;
        default:
          return;
      }

      // Show the container
      this.previewContainer.style.display = 'block';
      // Use setTimeout to trigger transition
      setTimeout(() => {
        if (this.previewContainer) {
          this.previewContainer.style.opacity = '1';
          this.previewContainer.style.transform = 'scale(1)';
        }
      }, 50);
      this.isPreviewVisible = true;

    } catch (error) {
      console.error('Error showing preview:', error);
      this.hidePreviewContainer();
    }
  }

  private async showImagePreview(link: { url: string; type: 'prntsc' | 'hizliresim'; element: HTMLElement }) {
    if (!this.previewContainer) return;

    // Create loading indicator
    const loadingDiv = document.createElement('div');
    loadingDiv.style.color = 'white';
    loadingDiv.style.padding = '20px';
    loadingDiv.textContent = 'Loading preview...';
    this.previewContainer.appendChild(loadingDiv);

    try {
      // Create container for the image
      const container = document.createElement('div');
      container.style.maxWidth = '400px';
      container.style.maxHeight = '300px';
      container.style.overflow = 'hidden';
      container.style.borderRadius = '8px';
      container.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';

      // Create image element
      const img = document.createElement('img');
      img.style.width = '100%';
      img.style.height = 'auto';
      img.style.display = 'block';
      img.style.objectFit = 'contain';

      // Add loading and error handlers
      img.onload = () => {
        loadingDiv.remove();
        this.previewContainer?.appendChild(container);
        container.appendChild(img);
      };

      img.onerror = () => {
        loadingDiv.textContent = 'Failed to load image preview';
        setTimeout(() => {
          this.hidePreviewContainer();
        }, 2000);
      };

      // Set image source based on type
      if (link.type === 'prntsc') {
        // For prnt.sc, we need to fetch the actual image URL
        const prntscId = link.url.split('/').pop();
        img.src = `https://image.prntscr.com/${prntscId}.png`;
      } else if (link.type === 'hizliresim') {
        // For hizliresim, we can use the direct URL
        img.src = link.url;
      }

    } catch (error) {
      console.error('Error showing image preview:', error);
      loadingDiv.textContent = 'Failed to load preview';
      setTimeout(() => {
        this.hidePreviewContainer();
      }, 2000);
    }
  }

  private async showYouTubePreview(link: { url: string; type: 'youtube'; element: HTMLElement }) {
    if (!this.isEnabled || !this.previewContainer) return;
    
    const videoId = this.extractYoutubeVideoId(link.url);
    if (!videoId) return;

    // Convert volume from 0-100 to 0-1 for YouTube API
    const normalizedVolume = this.settings.volume / 100;
    
    const iframe = document.createElement('iframe');
    iframe.width = '480px';
    iframe.height = '360px';
    iframe.style.borderRadius = '8px';
    iframe.style.border = 'none';
    
    // Set initial parameters
    const params = new URLSearchParams({
      autoplay: '1',
      mute: this.settings.volume === 0 ? '1' : '0',
      enablejsapi: '1',
      origin: window.location.origin,
      widget_referrer: window.location.href
    });

    iframe.src = `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    
    // Add event listener to set volume after iframe loads
    iframe.addEventListener('load', () => {
      // Use YouTube Player API to set volume
      const message = {
        event: 'command',
        func: 'setVolume',
        args: [this.settings.volume]
      };
      
      iframe.contentWindow?.postMessage(JSON.stringify(message), '*');
    });
    
    this.previewContainer.appendChild(iframe);

    // Add message listener for YouTube API responses
    window.addEventListener('message', (event) => {
      if (event.source === iframe.contentWindow) {
        try {
          const data = JSON.parse(event.data);
          if (data.event === 'onReady') {
            // Set volume again when player is ready
            const volumeMessage = {
              event: 'command',
              func: 'setVolume',
              args: [this.settings.volume]
            };
            iframe.contentWindow?.postMessage(JSON.stringify(volumeMessage), '*');
          }
        } catch (e) {
          // Ignore parsing errors from other messages
        }
      }
    });
  }

  private async showInstagramPreview(link: { url: string; type: 'instagram'; element: HTMLElement }) {
    if (!this.previewContainer) return;
    
    const postId = this.extractInstagramId(link.url);
    if (!postId) return;

    const iframe = document.createElement('iframe');
    iframe.width = '400px';   // Kept the same width
    iframe.height = '600px';  // Increased from 480px for taller preview
    iframe.style.borderRadius = '8px';
    iframe.style.border = 'none';
    iframe.src = `https://www.instagram.com/p/${postId}/embed/`;
    
    this.previewContainer.appendChild(iframe);
  }

  private async showTwitterPreview(link: { url: string; type: 'twitter'; element: HTMLElement }) {
    if (!this.previewContainer) return;
    
    const tweetId = this.extractTwitterId(link.url);
    if (!tweetId) return;

    const iframe = document.createElement('iframe');
    iframe.width = '450px';   // Updated size
    iframe.height = '450px';  // Updated size
    iframe.style.borderRadius = '8px';
    iframe.style.border = 'none';
    iframe.src = `https://platform.twitter.com/embed/Tweet.html?id=${tweetId}&theme=dark`;
    
    this.previewContainer.appendChild(iframe);
  }

  private hidePreviewContainer(): void {
    if (!this.previewContainer) return;

    this.previewContainer.style.opacity = '0';
    this.previewContainer.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      if (this.previewContainer) {
        this.previewContainer.style.display = 'none';
        this.previewContainer.innerHTML = '';
        this.addCloseButton();
      }
      this.currentLink = null;
      this.isPreviewVisible = false;
      this.initialLink = null;
    }, 300);
  }

  private extractYoutubeVideoId(url: string): string | null {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  }

  private extractTwitterId(url: string): string | null {
    // Handle both old twitter.com and new x.com URLs, and remove @ prefix
    const cleanUrl = url.replace(/^@/, '');
    const regExp = /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/;
    const match = cleanUrl.match(regExp);
    return match ? match[1] : null;
  }

  private extractInstagramId(url: string): string | null {
    const regex = /instagram\.com\/(?:p|reels|reel)\/([A-Za-z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  private extractPrntscImageUrl(url: string): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const ogImage = doc.querySelector('meta[property="og:image"]');
        if (ogImage instanceof HTMLMetaElement) {
          resolve(ogImage.content);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error extracting Prnt.sc image URL:', error);
        resolve(null);
      }
    });
  }

  private extractHizliresimImageUrl(url: string): Promise<string | null> {
    return new Promise(async (resolve, reject) => {
      try {
        const response = await fetch(url);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const ogImage = doc.querySelector('meta[property="og:image"]');
        if (ogImage instanceof HTMLMetaElement) {
          resolve(ogImage.content);
        } else {
          resolve(null);
        }
      } catch (error) {
        console.error('Error extracting Hizliresim image URL:', error);
        resolve(null);
      }
    });
  }

  private cleanup() {
    // Remove preview container and event listeners
    if (this.previewContainer) {
      this.previewContainer.remove();
      this.previewContainer = null;
    }
    document.removeEventListener('linksDetected', this.handleLinksDetected);
  }

  private initialize() {
    if (!this.isEnabled) return;

    // Create preview container if it doesn't exist
    if (!this.previewContainer) {
      this.previewContainer = document.createElement('div');
      this.previewContainer.className = 'link-preview-container';
      document.body.appendChild(this.previewContainer);
    }

    // Add event listener for link detection
    document.addEventListener('linksDetected', this.handleLinksDetected);
  }

  private handleLinksDetected = (event: Event) => {
    if (!this.isEnabled) return;

    const customEvent = event as CustomEvent;
    const links = customEvent.detail.links as Link[];
    
    links.forEach((link: Link) => {
      if (!this.isEnabled) return;

      switch (link.type) {
        case 'youtube':
          this.showYouTubePreview(link as { url: string; type: 'youtube'; element: HTMLElement });
          break;
        case 'instagram':
          this.showInstagramPreview(link as { url: string; type: 'instagram'; element: HTMLElement });
          break;
        case 'twitter':
          this.showTwitterPreview(link as { url: string; type: 'twitter'; element: HTMLElement });
          break;
      }
    });
  }
} 
