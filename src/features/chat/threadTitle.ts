const DEFAULT_TITLE = 'New chat'

/**
 * Builds a short thread title from the user's first message (max length enforced for API).
 */
export function deriveThreadTitle(raw: string, max = 72): string {
  const line = raw.trim().split(/\r?\n/)[0] ?? ''
  const collapsed = line.replace(/\s+/g, ' ')
  if (!collapsed) return DEFAULT_TITLE
  if (collapsed.length <= max) return collapsed
  return `${collapsed.slice(0, max - 1).trimEnd()}…`
}
