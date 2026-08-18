/**
 * Avatar label for a username: its first letter, uppercased.
 *
 * Returns "?" when the name is missing or blank, so an avatar always has
 * something to show rather than collapsing to an empty circle.
 *
 * The session can still be loading, so this has to survive a null user.
 */
export function initials(username: string | undefined | null): string {
  const name = username?.trim();
  if (!name) return "?";
  return [...name][0].toUpperCase();
}
