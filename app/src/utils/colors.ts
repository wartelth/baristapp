/**
 * iOS Shortcuts-inspired color palette for mini-app cards.
 * Colors are vivid and work well on dark backgrounds.
 */
const CARD_COLORS = [
  "#FF6B6B", // coral red
  "#FF8A50", // warm orange
  "#FFB830", // golden yellow
  "#4ECB71", // fresh green
  "#2ECC71", // emerald
  "#00B894", // mint
  "#0ABDE3", // sky blue
  "#4A90D9", // steel blue
  "#6C5CE7", // purple
  "#A855F7", // violet
  "#E84393", // pink
  "#FD79A8", // soft pink
  "#636E72", // slate (neutral)
  "#F97316", // tangerine
  "#14B8A6", // teal
  "#8B5CF6", // indigo
];

/**
 * Simple hash function for strings.
 * Returns a consistent integer for a given string.
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/** Get a deterministic card color from an appId. */
export function getCardColor(appId: string): string {
  const index = hashString(appId) % CARD_COLORS.length;
  return CARD_COLORS[index];
}
