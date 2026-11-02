// Where a visitor goes back to after logging in or signing up: a page of the site they were on
// (the service page they tried to book from), carried in the login address as `return_to`.

export const RETURN_PARAM = "return_to";

/** The path to return to, or null unless it is a page of this site (never another site, and never
 *  the login or sign-up pages themselves, which would loop) */
export function safeReturnPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  const path = value.split(/[?#]/)[0];
  if (path === "/login" || path.startsWith("/login/") || path === "/signup" || path.startsWith("/signup/")) return null;
  return value;
}

/** An address on the login or sign-up pages that remembers where to come back to */
export function withReturn(path: "/login" | "/signup", returnTo: string | null | undefined): string {
  const safe = safeReturnPath(returnTo);
  return safe ? `${path}?${RETURN_PARAM}=${encodeURIComponent(safe)}` : path;
}
