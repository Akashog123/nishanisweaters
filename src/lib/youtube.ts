/**
 * YouTube URL utilities for video validation, ID extraction, and thumbnail generation
 */

// Regex patterns for YouTube URL formats
const YOUTUBE_PATTERNS = [
  // Standard watch URL: youtube.com/watch?v=VIDEO_ID
  /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  // Short URL: youtu.be/VIDEO_ID
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  // Embed URL: youtube.com/embed/VIDEO_ID
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  // YouTube Shorts: youtube.com/shorts/VIDEO_ID
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
];

export type ThumbnailQuality = 'default' | 'mqdefault' | 'hqdefault' | 'sddefault' | 'maxresdefault';

export interface YouTubeVideoInfo {
  videoId: string;
  thumbnail: string;
  embedUrl: string;
}

/**
 * Extract YouTube video ID from various URL formats
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/, youtube.com/shorts/
 * @param url - YouTube URL string
 * @returns 11-character video ID or null if invalid
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  const trimmedUrl = url.trim();

  for (const pattern of YOUTUBE_PATTERNS) {
    const match = trimmedUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // Check if the input is already a valid video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return null;
}

/**
 * Validate if a string is a valid YouTube URL
 * @param url - URL string to validate
 * @returns true if valid YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeVideoId(url) !== null;
}

/**
 * Validate if a string is a valid YouTube video ID format
 * @param videoId - Video ID string to validate
 * @returns true if valid 11-character YouTube video ID
 */
export function isValidYouTubeVideoId(videoId: string): boolean {
  return /^[a-zA-Z0-9_-]{11}$/.test(videoId);
}

/**
 * Get YouTube thumbnail URL from video ID
 * Quality options:
 * - default: 120x90
 * - mqdefault: 320x180
 * - hqdefault: 480x360
 * - sddefault: 640x480
 * - maxresdefault: 1280x720 (may not exist for all videos)
 * @param videoId - YouTube video ID
 * @param quality - Thumbnail quality (default: 'hqdefault')
 * @returns Thumbnail URL
 */
export function getYouTubeThumbnail(
  videoId: string,
  quality: ThumbnailQuality = 'hqdefault'
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Get YouTube embed URL for iframe
 * @param videoId - YouTube video ID
 * @param autoplay - Whether to autoplay (default: false)
 * @returns Embed URL
 */
export function getYouTubeEmbedUrl(videoId: string, autoplay: boolean = false): string {
  const baseUrl = `https://www.youtube.com/embed/${videoId}`;
  return autoplay ? `${baseUrl}?autoplay=1` : baseUrl;
}

/**
 * Get YouTube watch URL
 * @param videoId - YouTube video ID
 * @returns Watch URL
 */
export function getYouTubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/**
 * Parse YouTube URL and return video info
 * @param url - YouTube URL
 * @returns Video info object or null if invalid
 */
export function parseYouTubeUrl(url: string): YouTubeVideoInfo | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;

  return {
    videoId,
    thumbnail: getYouTubeThumbnail(videoId),
    embedUrl: getYouTubeEmbedUrl(videoId),
  };
}
