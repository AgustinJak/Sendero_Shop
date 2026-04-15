/**
 * YouTube URL utilities — extract IDs, thumbnails, validation.
 *
 * Supported formats:
 *  - https://www.youtube.com/watch?v=ID
 *  - https://youtu.be/ID
 *  - https://www.youtube.com/embed/ID
 *  - https://youtube.com/shorts/ID
 *  - https://m.youtube.com/watch?v=ID
 */

const YT_REGEX =
  /(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/;

/** Extract the 11-char video ID from any YouTube URL. */
export function extractYouTubeId(url: string): string | null {
  const match = url.match(YT_REGEX);
  return match ? match[1] : null;
}

/** Deterministic thumbnail URL (480×360, always available). */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/** Quick check: does this string look like a YouTube URL? */
export function isYouTubeUrl(url: string): boolean {
  return YT_REGEX.test(url);
}
