/**
 * Returns the list of admin email addresses from the ADMIN_EMAILS env variable.
 * Format: comma-separated list, e.g. "alice@example.com, bob@example.com"
 *
 * This file is server-only — never import it in client components.
 */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Returns true if the given email belongs to an admin.
 * Comparison is case-insensitive.
 */
export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.toLowerCase());
}
