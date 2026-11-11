/**
 * Extracts the access token from a `set-cookie` header returned by axios.
 *
 * The header may arrive as an array (one entry per cookie) or as a single
 * comma-separated string. The access token is the first cookie.
 */
export function accessTokenFromSetCookie(
  setCookie: string[] | string | undefined | null
): string | null {
  const header = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  if (!header) return null;

  const value = header.split(',')[0].split(';')[0].split('=')[1];
  return value || null;
}
