/**
 * YouTube URL helpers.
 *
 * expo-video can only play direct video files (.mp4 / HLS). Trainers paste
 * YouTube links, which need an embed player (react-native-webview). These pure
 * helpers detect a YouTube URL and extract its 11-char video id so ExerciseRow
 * can route YouTube → embed player, direct file → expo-video.
 */

const YT_PATTERNS: RegExp[] = [
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/, // watch?v=ID (with any preceding params)
  /youtu\.be\/([\w-]{11})/, //                    youtu.be/ID
  /youtube\.com\/embed\/([\w-]{11})/, //          /embed/ID
  /youtube\.com\/shorts\/([\w-]{11})/, //         /shorts/ID
  /youtube\.com\/v\/([\w-]{11})/, //              /v/ID
];

/**
 * Returns the 11-character YouTube video id for a YouTube URL, or null if the
 * URL is not a recognised YouTube link (e.g. a direct .mp4 or an image URL).
 */
export function parseYouTubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  for (const re of YT_PATTERNS) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** True when `url` is a YouTube link (watch / youtu.be / embed / shorts). */
export function isYouTubeUrl(url: string | null | undefined): boolean {
  return parseYouTubeId(url) !== null;
}
