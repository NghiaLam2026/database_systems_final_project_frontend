const DEFAULT_APP_PATH = '/app'

/**
 * Only allow in-app relative redirects under `/app` to avoid open redirects after login.
 */
export function safePostLoginPath(from: unknown, fallback: string = DEFAULT_APP_PATH): string {
  if (typeof from !== 'string' || !from.startsWith('/')) return fallback
  if (from.startsWith('//') || from.includes('..')) return fallback
  // Reject scheme-like paths (`/\` is still relative on some parsers; keep conservative)
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(from)) return fallback
  if (!from.startsWith('/app')) return fallback
  return from
}
