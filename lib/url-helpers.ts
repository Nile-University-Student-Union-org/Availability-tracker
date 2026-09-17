/**
 * Validates and sanitizes a callback or redirect URL to prevent Open Redirect vulnerabilities.
 * Ensures the target is strictly an internal application path (starting with single '/').
 */
export function getSafeCallbackUrl(url?: string | null, fallback = "/"): string {
  if (!url || typeof url !== "string") {
    return fallback
  }

  const trimmed = url.trim()

  // Must start with '/' but NOT '//' or '/\' (protocol-relative or Windows-path trickery)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback
  }

  // Reject URLs containing control characters or embedded schemes
  if (/[\u0000-\u001F\u007F-\u009F]/.test(trimmed) || trimmed.includes("://")) {
    return fallback
  }

  return trimmed
}
