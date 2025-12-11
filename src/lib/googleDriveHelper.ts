/**
 * Helper functions for converting Google Drive links to direct image URLs
 */

/**
 * Converts a Google Drive share link to a direct image URL
 * 
 * @param shareLink - Google Drive share link (various formats supported)
 * @returns Direct image URL that can be used in <img> tags
 * 
 * @example
 * convertGoogleDriveLink('https://drive.google.com/file/d/1ABC123xyz/view?usp=sharing')
 * // Returns: 'https://drive.google.com/uc?export=view&id=1ABC123xyz'
 */
export function convertGoogleDriveLink(shareLink: string): string {
  if (!shareLink || !shareLink.includes('drive.google.com')) {
    return shareLink; // Return original if not a Google Drive link
  }

  // Extract file ID from various Google Drive link formats
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,           // Standard format: /file/d/FILE_ID/
    /[?&]id=([a-zA-Z0-9_-]+)/,               // ID parameter format: ?id=FILE_ID or &id=FILE_ID
    /\/d\/([a-zA-Z0-9_-]+)/,                 // Short format: /d/FILE_ID
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/, // Open format: /open?id=FILE_ID
  ];

  for (const pattern of patterns) {
    const match = shareLink.match(pattern);
    if (match && match[1]) {
      const fileId = match[1];
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
  }

  // If no pattern matches, return original link
  console.warn('Could not extract file ID from Google Drive link:', shareLink);
  return shareLink;
}

/**
 * Batch convert multiple Google Drive links
 * 
 * @param links - Array of Google Drive share links
 * @returns Array of converted direct image URLs
 */
export function convertGoogleDriveLinks(links: string[]): string[] {
  return links.map(convertGoogleDriveLink);
}

/**
 * Check if a URL is a Google Drive link
 */
export function isGoogleDriveLink(url: string): boolean {
  return url?.includes('drive.google.com') || false;
}

/**
 * Extract file ID from Google Drive link
 */
export function extractGoogleDriveFileId(shareLink: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = shareLink.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

