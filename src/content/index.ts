import { LinkDetector } from './linkDetector';
import { PreviewManager } from './previewManager';
import { Link } from './linkDetector';

class ContentScript {
  private linkDetector: LinkDetector;
  private previewManager: PreviewManager;
  private processedLinks: Set<string> = new Set();
  private observer: MutationObserver | null = null;

  constructor() {
    this.linkDetector = new LinkDetector();
    this.previewManager = new PreviewManager();
    console.log('Content script initialized');
    this.init();
  }

  private init(): void {
    console.log('Initializing Kick Link Preview extension...');
    // Start observing the entire document for changes
    this.startObserving();
    // Process any existing links
    this.scanForLinks();
  }

  private startObserving(): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new MutationObserver((mutations) => {
      let shouldScan = false;
      
      mutations.forEach((mutation) => {
        // Check if any nodes were added
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) {
              // If the added node contains an anchor tag, we should scan
              if (node.querySelector('a') || node.tagName === 'A') {
                shouldScan = true;
              }
            }
          });
        }
      });

      // Only scan if we found potential new links
      if (shouldScan) {
        this.scanForLinks();
      }
    });

    // Observe the entire document
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Additional interval-based scanning
    setInterval(() => {
      this.scanForLinks();
    }, 5000); // Scan every 5 seconds

    console.log('Document observer started');
  }

  private scanForLinks(): void {
    try {
      // Find all YouTube, Instagram and Twitter links in the document
      const links = document.querySelectorAll('a[href*="youtube.com"], a[href*="youtu.be"], a[href*="instagram.com"], a[href*="twitter.com"], a[href*="x.com"]');
      
      links.forEach(link => {
        if (link instanceof HTMLAnchorElement) {
          const url = link.href;
          
          // Skip if we've already processed this link
          if (this.processedLinks.has(url)) {
            return;
          }

          console.log('Found new link:', url);

          // Determine the type of link
          let type: 'youtube' | 'instagram' | 'twitter';
          if (url.includes('youtube.com') || url.includes('youtu.be')) {
            type = 'youtube';
          } else if (url.includes('instagram.com')) {
            type = 'instagram';
          } else {
            type = 'twitter';
          }

          // Create Link object
          const linkObj: Link = {
            url,
            type,
            element: link
          };

          // Attach preview handler
          this.previewManager.attachPreviewHandler(linkObj);

          // Mark as processed
          this.processedLinks.add(url);

          // Keep the set from growing too large
          if (this.processedLinks.size > 1000) {
            const iterator = this.processedLinks.values();
            for (let i = 0; i < 100; i++) {
              this.processedLinks.delete(iterator.next().value as string);
            }
          }
        }
      });
    } catch (error) {
      console.error('Error scanning for links:', error);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing ContentScript');
    new ContentScript();
  });
} else {
  console.log('DOM already ready - Initializing ContentScript');
  new ContentScript();
} 