/**
 * The photo that stands for a service on the site (cards, the booking popup): the one the admin
 * starred, or the first photo when none is starred or the starred one is no longer in the gallery.
 */
export function pickMainPhoto(photoUrls: string[], starredUrl: string | null | undefined): string | null {
  if (starredUrl && photoUrls.includes(starredUrl)) return starredUrl;
  return photoUrls[0] ?? null;
}
