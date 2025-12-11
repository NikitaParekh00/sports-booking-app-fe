/**
 * Helper functions for handling player image URLs
 * Automatically converts Google Drive links and uses proxy to bypass CORS
 */

import { convertGoogleDriveLink, isGoogleDriveLink } from './googleDriveHelper';

/**
 * Process image URL - converts Google Drive links and uses proxy to bypass CORS
 * 
 * @param url - Image URL (can be Google Drive share link or direct URL)
 * @returns Processed URL ready to use in <img> tags (uses proxy for Google Drive)
 * 
 * @example
 * processImageUrl('https://drive.google.com/file/d/1ABC123xyz/view')
 * // Returns: '/api/proxy-image?url=https://drive.google.com/uc?export=view&id=1ABC123xyz'
 * 
 * processImageUrl('https://example.com/image.jpg')
 * // Returns: 'https://example.com/image.jpg' (unchanged)
 */
export function processImageUrl(url: string | null | undefined): string | null {
    if (!url) return null;

    // If it's a Google Drive link, convert it and use proxy to bypass CORS
    if (isGoogleDriveLink(url)) {
        const directUrl = convertGoogleDriveLink(url);
        // Use our API proxy to bypass CORS restrictions
        return `/api/proxy-image?url=${encodeURIComponent(directUrl)}`;
    }

    // Otherwise, return as-is
    return url;
}

/**
 * Validate if an image URL is accessible
 * (Client-side validation - checks format only)
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
    if (!url) return false;

    // Check if it's a valid URL format
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Get image URL with fallback
 */
export function getImageUrlWithFallback(
    url: string | null | undefined,
    fallback?: string
): string {
    const processed = processImageUrl(url);
    if (processed && isValidImageUrl(processed)) {
        return processed;
    }
    return fallback || '/placeholder-player.png'; // Default placeholder
}

