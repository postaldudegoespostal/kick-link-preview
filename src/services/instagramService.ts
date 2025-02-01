import browser from 'webextension-polyfill';

interface InstagramCredentials {
  appId: string;
  appSecret: string;
  displayName: string;
}

export class InstagramService {
  private readonly OEMBED_API_URL = 'https://api.instagram.com/oembed';
  private readonly ACCESS_TOKEN: string = ''; // Instagram API token will be needed
  private credentials: InstagramCredentials;

  constructor() {
    this.credentials = {
      appId: '1619637008679040',
      appSecret: '29cc9956a426034b03ab24c1b80100fc',
      displayName: 'kick-link-preview'
    };
  }

  private async loadCredentials(): Promise<void> {
    const result = await browser.storage.local.get(['instagramCredentials']);
    this.credentials = result.instagramCredentials as InstagramCredentials;

    if (!this.credentials?.appId || !this.credentials?.appSecret) {
      // Default credentials from build time
      this.credentials = {
        appId: '1619637008679040',
        appSecret: '29cc9956a426034b03ab24c1b80100fc',
        displayName: 'kick-link-preview'
      };
      
      // Save to storage
      await browser.storage.local.set({ instagramCredentials: this.credentials });
    }
  }

  public async getPostPreview(url: string): Promise<string> {
    if (!this.credentials) {
      await this.loadCredentials();
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${this.credentials.appId}|${this.credentials.appSecret}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch Instagram preview');
      }

      const data = await response.json();
      return data.html;
    } catch (error) {
      console.error('Error fetching Instagram preview:', error);
      return `
        <div style="width: 320px; height: 180px; display: flex; align-items: center; justify-content: center; color: white; background: rgba(0,0,0,0.8);">
          Failed to load Instagram preview
        </div>
      `;
    }
  }

  public async getEmbedHtml(url: string): Promise<string> {
    try {
      // First try with oEmbed API
      const oembedUrl = `${this.OEMBED_API_URL}?url=${encodeURIComponent(url)}&maxwidth=400&maxheight=300&omitscript=true`;
      
      const response = await fetch(oembedUrl);
      if (!response.ok) {
        throw new Error('Instagram API request failed');
      }

      const data = await response.json();
      return data.html;
    } catch (error) {
      console.error('Error fetching Instagram embed:', error);
      
      // Fallback: Create a direct link to the post
      const postId = this.extractPostId(url);
      if (postId) {
        return `<iframe src="https://www.instagram.com/p/${postId}/embed/" 
                width="100%" 
                height="100%" 
                frameborder="0" 
                scrolling="no" 
                allowtransparency="true"
                style="border-radius: 8px;"></iframe>`;
      }
      
      throw error;
    }
  }

  private extractPostId(url: string): string | null {
    const regex = /instagram\.com\/(?:p|reels|reel)\/([A-Za-z0-9_-]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }
} 