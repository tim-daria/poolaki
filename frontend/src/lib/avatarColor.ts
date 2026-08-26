/**
 * Picks an avatar background out of `theme.palette.avatar` for a username.
 *
 * The choice is derived from the name itself, so a member keeps the same color
 * across reloads and between the header and the member list — nothing has to be
 * stored server-side.
 *
 * The palette is small (one entry per AvatarGroup slot), so two members in the
 * same group can land on the same color; the initial and the tooltip are what
 * tell them apart.
 */
export function avatarColor(
  username: string | undefined | null,
  palette: readonly string[],
): string {
  const name = username?.trim();
  if (!name) return palette[0];

  // djb2: cheap, well-spread, and stable across browsers and sessions.
  let hash = 5381;
  for (const ch of name) hash = (hash * 33 + ch.codePointAt(0)!) | 0;

  return palette[Math.abs(hash) % palette.length];
}
