export interface Link {
  url: string;
  type: 'youtube' | 'instagram' | 'twitter' | 'prntsc' | 'hizliresim';
  element: HTMLElement;
}

export class LinkDetector {
  private youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  private instagramRegex = /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reels|reel)\/([a-zA-Z0-9_-]+)/;
  private twitterRegex = /@?(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)\s*/;
  // Temporarily disabled - will be implemented in future updates
  // private prntscRegex = /https?:\/\/prnt\.sc\/[a-zA-Z0-9]+/gi;
  // private hizliresimRegex = /https?:\/\/hizliresim\.com\/[a-zA-Z0-9]+/gi;
  private kickLinkRegex = /(?:https?:\/\/)?(?:www\.)?kick\.com/i;

  private observer: MutationObserver | null = null;
  private isEnabled: boolean = false;
  private isDashboard: boolean = false;
  private messageSelectors = [
    '.chat-entry-content',
    '[class*="message-content"]',
    '[class*="chat-message-content"]',
    '[class*="chatroom-message"]',
    '[class*="message"]',
    '[class*="chat-line"]',
    '.message-text',
    '.text-content',
    '.content-text',
    '[class*="text"]',
    'span.font-normal',
    'a.underline'
  ];

  constructor() {
    // Check if we're on the dashboard
    this.isDashboard = window.location.pathname.includes('/dashboard');
    
    // Get initial enabled state from storage
    chrome.storage.sync.get('isPluginEnabled', (result) => {
      this.isEnabled = result.isPluginEnabled !== false; // Default to true if not set
      if (this.isEnabled && !this.isDashboard) {
        this.initializeObserver();
      }
    });

    // Listen for changes in plugin state
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.isPluginEnabled) {
        this.isEnabled = changes.isPluginEnabled.newValue;
        if (this.isEnabled && !this.isDashboard) {
          this.initializeObserver();
        } else {
          this.cleanup();
        }
      }
    });
  }

  private cleanup() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    // Remove any existing previews
    const previews = document.querySelectorAll('.link-preview-container');
    previews.forEach(preview => preview.remove());
  }

  private initializeObserver() {
    if (this.observer || this.isDashboard || !this.isEnabled) return;

    this.observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) {
        this.cleanup();
        return;
      }

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              try {
                // Performance optimization: Quick checks first
                if (!this.isEnabled || 
                    !node.textContent || 
                    node.closest('.link-preview-container') ||
                    node.closest('[class*="kick"]') ||
                    node.closest('[class*="system"]') ||
                    node.closest('[class*="admin"]') ||
                    window.top !== window.self) {
                  return;
                }

                // Batch process links to reduce DOM operations
                const allLinks = [
                  ...this.scanTextForLinks(node),
                  ...this.findLinks(node)
                ];

                if (allLinks.length > 0) {
                  console.log('Found links:', allLinks);
                  // Dispatch a single custom event with all links
                  const event = new CustomEvent('linksDetected', {
                    detail: { links: allLinks }
                  });
                  document.dispatchEvent(event);
                }
              } catch (error) {
                console.error('Error processing node:', error);
                if (error instanceof Error && error.message.includes('stack')) {
                  this.cleanup();
                }
              }
            }
          });
        }
      });
    });

    // Find chat container with optimized selectors
    const chatSelectors = [
      '.chat-container',
      '.chatroom-container',
      '[class*="chat-wrapper"]'
    ];

    const chatContainer = chatSelectors
      .map(selector => document.querySelector(selector))
      .find(container => container !== null);

    if (chatContainer) {
      console.log('Starting observer on chat container:', chatContainer);
      this.observer.observe(chatContainer, {
        childList: true,
        subtree: true
      });
    } else {
      console.log('Chat container not found, will retry once in 2 seconds');
      setTimeout(() => {
        if (!this.isEnabled) return;
        
        const retryContainer = chatSelectors
          .map(selector => document.querySelector(selector))
          .find(container => container !== null);

        if (retryContainer) {
          console.log('Chat container found on retry:', retryContainer);
          this.observer?.observe(retryContainer, {
            childList: true,
            subtree: true
          });
        }
      }, 2000);
    }
  }

  private scanTextForLinks(element: HTMLElement): Link[] {
    const links: Link[] = [];
    const text = element.innerText || element.textContent || '';
    
    // Skip if this is a system message or admin element
    if (element.closest('[class*="system"]') || 
        element.closest('[class*="admin"]')) {
      return links;
    }
    
    // Extract URLs and check for each type
    const youtubeMatches = text.match(this.youtubeRegex);
    const instagramMatches = text.match(this.instagramRegex);
    const twitterMatches = text.match(this.twitterRegex);

    if (youtubeMatches) {
      youtubeMatches.forEach(url => {
        try {
          console.log('Found YouTube URL:', url);
          const anchor = this.createOrFindAnchor(element, url, 'youtube');
          if (anchor) {
            links.push({ url: anchor.href, type: 'youtube', element: anchor });
          }
        } catch (error) {
          console.error('Error processing YouTube URL:', error);
        }
      });
    }

    if (instagramMatches) {
      instagramMatches.forEach(url => {
        try {
          console.log('Found Instagram URL:', url);
          const anchor = this.createOrFindAnchor(element, url, 'instagram');
          if (anchor) {
            links.push({ url: anchor.href, type: 'instagram', element: anchor });
          }
        } catch (error) {
          console.error('Error processing Instagram URL:', error);
        }
      });
    }

    if (twitterMatches) {
      twitterMatches.forEach(url => {
        try {
          console.log('Found Twitter URL:', url);
          const anchor = this.createOrFindAnchor(element, url, 'twitter');
          if (anchor) {
            links.push({ url: anchor.href, type: 'twitter', element: anchor });
          }
        } catch (error) {
          console.error('Error processing Twitter URL:', error);
        }
      });
    }

    return links;
  }

  private extractUrls(text: string): string[] {
    const urls: string[] = [];
    
    // Check for each type of URL
    // Temporarily disabled - will be implemented in future updates
    // const prntscMatches = Array.from(text.matchAll(this.prntscRegex)).map(match => match[0]);
    // const hizliresimMatches = Array.from(text.matchAll(this.hizliresimRegex)).map(match => match[0]);
    const youtubeMatches = text.match(new RegExp(this.youtubeRegex, 'gi')) || [];
    const instagramMatches = text.match(new RegExp(this.instagramRegex, 'gi')) || [];
    const twitterMatches = text.match(new RegExp(this.twitterRegex, 'gi')) || [];
    
    urls.push(...youtubeMatches, ...instagramMatches, ...twitterMatches);
    
    return urls.map(url => url.trim());
  }

  public findLinks(element: HTMLElement): Link[] {
    const links: Link[] = [];

    // First check the element itself
    const elementLinks = this.scanTextForLinks(element);
    links.push(...elementLinks);

    // Then check all possible message elements
    this.messageSelectors.forEach(selector => {
      try {
        const messageElements = element.querySelectorAll(selector);
        messageElements.forEach(messageEl => {
          if (messageEl instanceof HTMLElement) {
            const messageLinks = this.scanTextForLinks(messageEl);
            links.push(...messageLinks);
          }
        });
      } catch (error) {
        console.error('Error checking selector:', selector, error);
      }
    });

    // Remove duplicates
    const uniqueLinks = this.removeDuplicateLinks(links);
    return uniqueLinks;
  }

  private removeDuplicateLinks(links: Link[]): Link[] {
    const seen = new Set<string>();
    return links.filter(link => {
      const key = `${link.url}-${link.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private createOrFindAnchor(container: HTMLElement, url: string, type: 'youtube' | 'instagram' | 'twitter' | 'prntsc' | 'hizliresim'): HTMLAnchorElement | null {
    try {
      // First try to find existing anchor with this URL
      const existingAnchor = Array.from(container.querySelectorAll('a')).find(a => {
        const href = a.href.toLowerCase();
        return href.includes(url.toLowerCase()) || url.toLowerCase().includes(href);
      });

      if (existingAnchor) {
        return existingAnchor;
      }

      // Create new anchor
      const anchor = document.createElement('a');
      anchor.href = url.startsWith('http') ? url : `https://${url}`;
      anchor.textContent = url;
      anchor.className = `link-preview-${type}`;
      anchor.style.color = 'inherit';
      anchor.style.textDecoration = 'underline';
      anchor.style.cursor = 'pointer';
      anchor.style.wordBreak = 'break-all';
      anchor.style.display = 'inline-block';
      anchor.style.maxWidth = '100%';
      
      // Find where to insert the anchor
      const text = container.textContent || '';
      const urlIndex = text.indexOf(url);
      
      if (urlIndex !== -1) {
        // Try to find the exact text node containing the URL
        const textNodes = this.getAllTextNodes(container);
        let currentIndex = 0;
        let targetNode = null;
        let offset = 0;
        
        for (const node of textNodes) {
          const nodeText = node.textContent || '';
          if (currentIndex + nodeText.length > urlIndex) {
            targetNode = node;
            offset = urlIndex - currentIndex;
            break;
          }
          currentIndex += nodeText.length;
        }
        
        if (targetNode) {
          const beforeText = targetNode.textContent?.slice(0, offset) || '';
          const afterText = targetNode.textContent?.slice(offset + url.length) || '';
          
          const beforeNode = document.createTextNode(beforeText);
          const afterNode = document.createTextNode(afterText);
          
          const parent = targetNode.parentNode;
          if (parent) {
            parent.insertBefore(beforeNode, targetNode);
            parent.insertBefore(anchor, targetNode);
            parent.insertBefore(afterNode, targetNode);
            parent.removeChild(targetNode);
            return anchor;
          }
        }
      }
      
      // Fallback: append to container
      container.appendChild(anchor);
      return anchor;
    } catch (error) {
      console.error('Error creating or finding anchor:', error);
      return null;
    }
  }

  private getAllTextNodes(element: HTMLElement): Text[] {
    const textNodes: Text[] = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip if parent is already an anchor
          if (node.parentElement?.tagName === 'A') {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node instanceof Text) {
        textNodes.push(node);
      }
    }
    return textNodes;
  }
} 